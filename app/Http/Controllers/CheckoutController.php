<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItems;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Midtrans\Config;
use Midtrans\Snap;

class CheckoutController extends Controller
{
  public function __construct()
  {
    // Set Midtrans configuration
    Config::$serverKey = config('services.midtrans.server_key');
    Config::$isProduction = config('services.midtrans.is_production');
    Config::$isSanitized = config('services.midtrans.is_sanitized');
    Config::$is3ds = config('services.midtrans.is_3ds');
  }

  public function index()
  {
    return Inertia::render('customer/checkout/index');
  }

  public function processCheckout(Request $request)
  {
    $request->validate([
      'customer_name' => 'required|string|max:255',
      'table_number' => 'required|integer|min:1',
      'cart' => 'required|array|min:1',
      'cart.*.product.id' => 'required|exists:products,id',
      'cart.*.quantity' => 'required|integer|min:1',
      'cart.*.notes' => 'nullable|string|max:255',
    ]);

    try {
      DB::beginTransaction();

      // Create order
      $order = Order::create([
        'customer_name' => $request->customer_name,
        'table_number' => $request->table_number,
        'status' => 'pending',
      ]);

      $totalAmount = 0;

      // Create order items
      foreach ($request->cart as $cartItem) {
        $product = Product::findOrFail($cartItem['product']['id']);

        OrderItems::create([
          'order_id' => $order->id,
          'product_id' => $product->id,
          'quantity' => $cartItem['quantity'],
          'notes' => $cartItem['notes'] ?? null,
        ]);

        $totalAmount += $product->price * $cartItem['quantity'];
      }

      // Create payment record
      $payment = Payment::create([
        'order_id' => $order->id,
        'amount' => $totalAmount,
        'status' => 'pending',
        'payment_method' => 'midtrans',
      ]);

      // Generate unique order ID for Midtrans (format: KASIR-{timestamp}-{payment_id})
      $midtransOrderId = 'KASIR-' . time() . '-' . $payment->id;

      // Prepare Midtrans transaction
      $params = [
        'transaction_details' => [
          'order_id' => $midtransOrderId,
          'gross_amount' => (int) $totalAmount,
        ],
        'customer_details' => [
          'first_name' => $request->customer_name,
          'email' => 'customer@kasirku.com',
          'phone' => '08123456789',
        ],
        'item_details' => collect($request->cart)->map(function ($cartItem) {
          $product = Product::find($cartItem['product']['id']);
          return [
            'id' => $product->id,
            'price' => (int) $product->price,
            'quantity' => $cartItem['quantity'],
            'name' => $product->name,
          ];
        })->toArray(),
        'callbacks' => [
          'finish' => route('checkout.finish'),
          'unfinish' => route('checkout.unfinish'),
          'error' => route('checkout.error'),
        ],
      ];

      $snapToken = Snap::getSnapToken($params);

      // Update payment with transaction ID from Midtrans
      $payment->update([
        'transaction_id' => $midtransOrderId,
      ]);

      DB::commit();

      return response()->json([
        'snap_token' => $snapToken,
        'order_id' => $order->id,
        'payment_id' => $payment->id,
      ]);
    } catch (\Exception $e) {
      DB::rollBack();
      return response()->json([
        'error' => 'Terjadi kesalahan saat memproses pesanan: ' . $e->getMessage()
      ], 500);
    }
  }

  public function paymentFinish(Request $request)
  {
    $orderId = $request->query('order_id');
    $status = $request->query('transaction_status');

    return Inertia::render('customer/payment/finish', [
      'order_id' => $orderId,
      'status' => $status,
    ]);
  }

  public function paymentUnfinish(Request $request)
  {
    return Inertia::render('customer/payment/unfinish');
  }

  public function paymentError(Request $request)
  {
    return Inertia::render('customer/payment/error');
  }

  public function paymentNotification(Request $request)
  {
    try {
      $notification = new \Midtrans\Notification();

      $transactionStatus = $notification->transaction_status;
      $paymentType = $notification->payment_type;
      $orderId = $notification->order_id;
      $fraudStatus = $notification->fraud_status;

      $payment = Payment::where('transaction_id', $orderId)->firstOrFail();
      $order = $payment->order;

      if ($transactionStatus == 'capture') {
        if ($paymentType == 'credit_card') {
          if ($fraudStatus == 'challenge') {
            $payment->update(['status' => 'pending']);
          } else {
            $payment->update([
              'status' => 'completed',
              'paid_at' => now(),
            ]);
            $order->update(['status' => 'pending']);
          }
        }
      } elseif ($transactionStatus == 'settlement') {
        $payment->update([
          'status' => 'completed',
          'paid_at' => now(),
        ]);
        $order->update(['status' => 'pending']);
      } elseif ($transactionStatus == 'pending') {
        $payment->update(['status' => 'pending']);
      } elseif ($transactionStatus == 'deny') {
        $payment->update(['status' => 'failed']);
        $order->update(['status' => 'cancelled']);
      } elseif ($transactionStatus == 'expire') {
        $payment->update(['status' => 'failed']);
        $order->update(['status' => 'cancelled']);
      } elseif ($transactionStatus == 'cancel') {
        $payment->update(['status' => 'failed']);
        $order->update(['status' => 'cancelled']);
      }

      return response()->json(['status' => 'success']);
    } catch (\Exception $e) {
      return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
  }

  public function orderStatus($orderId)
  {
    $order = Order::with(['orderItems.product.photos', 'payment'])
      ->findOrFail($orderId);

    return Inertia::render('customer/order/status', [
      'order' => $order,
    ]);
  }

  public function checkOrderStatus($orderId)
  {
    $order = Order::with(['orderItems.product.photos', 'payment'])
      ->findOrFail($orderId);

    return response()->json([
      'order' => $order,
    ]);
  }
}
