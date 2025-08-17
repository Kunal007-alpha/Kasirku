import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { EditIcon, ImageIcon, PlusIcon, SearchIcon, TrashIcon, UploadIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

// Types
interface Category {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
}

interface ProductPhoto {
    id: number;
    product_id: string;
    url: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

interface Product {
    id: string;
    name: string;
    category_id: number;
    price: number;
    created_at: string;
    updated_at: string;
    category?: Category;
    photos?: ProductPhoto[];
}

interface ProductFormData {
    name: string;
    category_id: number | '';
    price: number | '';
    photos: File[];
    remove_photos: number[];
}

interface Props {
    products: Product[];
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
    },
    {
        title: 'Products',
        href: '/admin/products',
    },
];

export default function ProductsIndex({ products: initialProducts, categories }: Props) {
    // State
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        category_id: '',
        price: '',
        photos: [],
        remove_photos: [],
    });

    // Update products when props change
    useEffect(() => {
        setProducts(initialProducts);
    }, [initialProducts]);

    // Filter products based on search term and category
    const filteredProducts = products.filter((product) => {
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.category?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === '' || product.category_id.toString() === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            category_id: '',
            price: '',
            photos: [],
            remove_photos: [],
        });
        setErrors({});
    };

    // Handle form input changes
    const handleInputChange = (field: keyof ProductFormData, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const fileArray = Array.from(files);
            setFormData((prev) => ({
                ...prev,
                photos: [...prev.photos, ...fileArray],
            }));
        }
    };

    // Remove photo from form
    const removePhoto = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index),
        }));
    };

    // Mark existing photo for removal
    const markPhotoForRemoval = (photoId: number) => {
        setFormData((prev) => ({
            ...prev,
            remove_photos: [...prev.remove_photos, photoId],
        }));
    };

    // Unmark existing photo for removal
    const unmarkPhotoForRemoval = (photoId: number) => {
        setFormData((prev) => ({
            ...prev,
            remove_photos: prev.remove_photos.filter((id) => id !== photoId),
        }));
    };

    // Handle create product
    const handleCreate = async () => {
        setIsLoading(true);
        setErrors({});

        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('category_id', formData.category_id.toString());
        formDataToSend.append('price', formData.price.toString());

        formData.photos.forEach((photo, index) => {
            formDataToSend.append(`photos[${index}]`, photo);
        });

        router.post('/admin/products', formDataToSend, {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                resetForm();
            },
            onError: (errors) => {
                setErrors(errors);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Handle edit product
    const handleEdit = async () => {
        if (!selectedProduct) return;

        setIsLoading(true);
        setErrors({});

        const formDataToSend = new FormData();
        formDataToSend.append('_method', 'PUT');
        formDataToSend.append('name', formData.name);
        formDataToSend.append('category_id', formData.category_id.toString());
        formDataToSend.append('price', formData.price.toString());

        // Add new photos
        formData.photos.forEach((photo, index) => {
            formDataToSend.append(`photos[${index}]`, photo);
        });

        // Add photos to remove
        formData.remove_photos.forEach((photoId, index) => {
            formDataToSend.append(`remove_photos[${index}]`, photoId.toString());
        });

        router.post(`/admin/products/${selectedProduct.id}`, formDataToSend, {
            onSuccess: () => {
                setIsEditModalOpen(false);
                setSelectedProduct(null);
                resetForm();
            },
            onError: (errors) => {
                setErrors(errors);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Handle delete product
    const handleDelete = async () => {
        if (!selectedProduct) return;

        setIsLoading(true);

        router.delete(`/admin/products/${selectedProduct.id}`, {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setSelectedProduct(null);
            },
            onFinish: () => {
                setIsLoading(false);
            },
        });
    };

    // Open edit modal with selected product data
    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name,
            category_id: product.category_id,
            price: product.price,
            photos: [],
            remove_photos: [],
        });
        setIsEditModalOpen(true);
    };

    // Open delete modal
    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setIsDeleteModalOpen(true);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
        }).format(amount);
    };

    // Get primary photo
    const getPrimaryPhoto = (photos: ProductPhoto[] = []) => {
        if (photos.length === 0) return null;
        const primary = photos.find((photo) => photo.is_primary);
        return primary?.url || photos[0]?.url || null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products Management" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Products Management</h1>
                        <p className="text-muted-foreground">Manage your product catalog</p>
                    </div>

                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <PlusIcon />
                                Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                                <DialogDescription>Create a new product for your catalog</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Product Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        placeholder="Enter product name"
                                    />
                                    {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                                </div>

                                {/* Category */}
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={formData.category_id.toString()}
                                        onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.category_id && <p className="text-sm text-red-600">{errors.category_id}</p>}
                                </div>

                                {/* Price */}
                                <div className="space-y-2">
                                    <Label htmlFor="price">Price (IDR)</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || '')}
                                        placeholder="Enter price"
                                        min="0"
                                        step="1000"
                                    />
                                    {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                                </div>

                                {/* Photos */}
                                <div className="space-y-2">
                                    <Label>Product Photos</Label>
                                    <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                                        <div className="text-center">
                                            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="mt-2">
                                                <Input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={handleFileUpload}
                                                    className="hidden"
                                                    id="photo-upload"
                                                />
                                                <Label htmlFor="photo-upload" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500">
                                                    Click to upload photos
                                                </Label>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                                        </div>
                                    </div>

                                    {/* Preview uploaded photos */}
                                    {formData.photos.length > 0 && (
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            {formData.photos.map((photo, index) => (
                                                <div key={index} className="relative">
                                                    <img
                                                        src={URL.createObjectURL(photo)}
                                                        alt={`Upload ${index + 1}`}
                                                        className="h-20 w-full rounded object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-6 w-6"
                                                        onClick={() => removePhoto(index)}
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={isLoading || !formData.name || !formData.category_id || !formData.price}>
                                    {isLoading ? 'Creating...' : 'Create Product'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative max-w-md">
                        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Categories</SelectItem>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Products Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => {
                        const primaryPhotoUrl = getPrimaryPhoto(product.photos);
                        return (
                            <Card key={product.id} className="overflow-hidden">
                                <div className="relative aspect-square bg-gray-100">
                                    {primaryPhotoUrl ? (
                                        <img src={primaryPhotoUrl} alt={product.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <ImageIcon className="h-12 w-12 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                <CardHeader className="pb-2">
                                    <CardTitle className="truncate text-lg">{product.name}</CardTitle>
                                    <div className="flex items-center justify-between">
                                        <Badge variant="secondary">{product.category?.name}</Badge>
                                        <span className="text-lg font-semibold text-green-600">{formatCurrency(product.price)}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(product)}>
                                            <EditIcon className="h-4 w-4" />
                                            Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" className="flex-1" onClick={() => openDeleteModal(product)}>
                                            <TrashIcon className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Empty state */}
                {filteredProducts.length === 0 && (
                    <div className="py-12 text-center">
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchTerm || categoryFilter ? 'Try adjusting your search criteria' : 'Get started by adding a new product'}
                        </p>
                    </div>
                )}

                {/* Edit Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Product</DialogTitle>
                            <DialogDescription>Update product information</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {/* Product Name */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Product Name</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    placeholder="Enter product name"
                                />
                                {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category</Label>
                                <Select
                                    value={formData.category_id.toString()}
                                    onValueChange={(value) => handleInputChange('category_id', parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id.toString()}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.category_id && <p className="text-sm text-red-600">{errors.category_id}</p>}
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <Label htmlFor="edit-price">Price (IDR)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || '')}
                                    placeholder="Enter price"
                                    min="0"
                                    step="1000"
                                />
                                {errors.price && <p className="text-sm text-red-600">{errors.price}</p>}
                            </div>

                            {/* Current Photos */}
                            {selectedProduct?.photos && selectedProduct.photos.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Current Photos</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedProduct.photos.map((photo) => (
                                            <div key={photo.id} className="relative">
                                                <img src={photo.url} alt="Product" className="h-20 w-full rounded object-cover" />
                                                {photo.is_primary && <Badge className="absolute top-1 left-1 text-xs">Primary</Badge>}
                                                <Button
                                                    type="button"
                                                    variant={formData.remove_photos.includes(photo.id) ? 'default' : 'destructive'}
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={() => {
                                                        if (formData.remove_photos.includes(photo.id)) {
                                                            unmarkPhotoForRemoval(photo.id);
                                                        } else {
                                                            markPhotoForRemoval(photo.id);
                                                        }
                                                    }}
                                                >
                                                    <XIcon className="h-3 w-3" />
                                                </Button>
                                                {formData.remove_photos.includes(photo.id) && (
                                                    <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded bg-red-500">
                                                        <span className="text-xs font-bold text-white">Will Remove</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add New Photos */}
                            <div className="space-y-2">
                                <Label>Add New Photos</Label>
                                <div className="rounded-lg border-2 border-dashed border-gray-300 p-4">
                                    <div className="text-center">
                                        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="mt-2">
                                            <Input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="edit-photo-upload"
                                            />
                                            <Label htmlFor="edit-photo-upload" className="cursor-pointer text-sm text-blue-600 hover:text-blue-500">
                                                Click to upload new photos
                                            </Label>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB each</p>
                                    </div>
                                </div>

                                {/* Preview new photos */}
                                {formData.photos.length > 0 && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {formData.photos.map((photo, index) => (
                                            <div key={index} className="relative">
                                                <img
                                                    src={URL.createObjectURL(photo)}
                                                    alt={`Upload ${index + 1}`}
                                                    className="h-20 w-full rounded object-cover"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -top-2 -right-2 h-6 w-6"
                                                    onClick={() => removePhoto(index)}
                                                >
                                                    <XIcon className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {errors.photos && <p className="text-sm text-red-600">{errors.photos}</p>}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button onClick={handleEdit} disabled={isLoading || !formData.name || !formData.category_id || !formData.price}>
                                {isLoading ? 'Updating...' : 'Update Product'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Product</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone and will also remove all
                                associated photos.
                            </DialogDescription>
                        </DialogHeader>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                                {isLoading ? 'Deleting...' : 'Delete Product'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
