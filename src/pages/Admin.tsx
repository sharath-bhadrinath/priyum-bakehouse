import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Package, Users, BarChart3, Download, LogOut, Upload, X, Tag, TrendingUp } from "lucide-react";

interface Product {
  id: string;
  name: string;
  mrp: number;
  selling_price: number;
  description: string;
  image: string;
  category: string;
  category_id?: string | null;
  stock: number;
  info?: string | null;
  weight_options?: Array<{weight: number; mrp: number; selling_price: number; unit: string}> | null;
  base_weight?: number | null;
  weight_unit?: string | null;
  site_display?: boolean;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface ProductTag {
  id: string;
  product_id: string;
  tag_id: string;
  created_at: string;
}

interface WeightOption {
  weight: number;
  mrp: number;
  selling_price: number;
  unit: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string | null;
  total: number;
  status: string;
  order_date: string;
  subtotal?: number;
  shipping_charges?: number;
  discount_amount?: number;
  custom_order_date?: string;
  custom_invoice_date?: string;
  delivery_date?: string;
  shipment_number?: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
  weight?: number;
  weight_unit?: string;
}

interface InvoiceSettings {
  businessName: string;
  businessSubtitle: string;
  phone: string;
  email: string;
  orderDate: string;
  invoiceDate: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export default function Admin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [productTags, setProductTags] = useState<ProductTag[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isEditTagOpen, setIsEditTagOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: "",
    mrp: "",
    selling_price: "",
    description: "",
    image: "",
    category: "",
    category_id: "",
    stock: "",
    info: "",
    base_weight: "500",
    weight_unit: "grams",
    site_display: true
  });
  
  const [newTag, setNewTag] = useState({
    name: "",
    color: "#3B82F6"
  });
  
  const [selectedProductTags, setSelectedProductTags] = useState<string[]>([]);
  const [editSelectedProductTags, setEditSelectedProductTags] = useState<string[]>([]);
  const [weightOptions, setWeightOptions] = useState<WeightOption[]>([]);
  const [editWeightOptions, setEditWeightOptions] = useState<WeightOption[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    address: ""
  });

  const [categories, setCategories] = useState<{ id: string; name: string; display_name: string; base_category_id?: string | null }[]>([]);
  const [baseCategories, setBaseCategories] = useState<{ id: string; name: string; display_name: string }[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isAddBaseCategoryOpen, setIsAddBaseCategoryOpen] = useState(false);
  const [isEditBaseCategoryOpen, setIsEditBaseCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; display_name: string; base_category_id?: string | null } | null>(null);
  const [editingBaseCategory, setEditingBaseCategory] = useState<{ id: string; name: string; display_name: string } | null>(null);
  const [newCategory, setNewCategory] = useState<{ name: string; display_name: string; base_category_id: string }>({ name: "", display_name: "", base_category_id: "" });
  const [newBaseCategory, setNewBaseCategory] = useState<{ name: string; display_name: string }>({ name: "", display_name: "" });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const weightUnits = ["grams", "kg", "pieces"];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
  };

  useEffect(() => {
    checkAuth();
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchTags();
    fetchProductTags();
    fetchCategories();
    fetchBaseCategories();
    loadInvoiceSettings();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].name);
    }
  }, [categories, selectedCategory]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => {
        const itemAny = item as any;
        return {
          ...item,
          mrp: itemAny.mrp || item.price || 0,
          selling_price: itemAny.selling_price || item.price || 0,
          weight_options: item.weight_options ? (typeof item.weight_options === 'string' ? JSON.parse(item.weight_options) : item.weight_options) : null
        };
      }) || [];
      
      setProducts(transformedData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setTags(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tags",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories' as any)
        .select('id, name, display_name, base_category_id')
        .order('display_name', { ascending: true });
      if (error) throw error;
      setCategories((data as any) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const fetchBaseCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('base_categories' as any)
        .select('id, name, display_name')
        .order('display_name', { ascending: true });
      if (error) throw error;
      setBaseCategories((data as any) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch base categories",
        variant: "destructive",
      });
    }
  };

  const fetchProductTags = async () => {
    try {
      const { data, error } = await supabase
        .from('product_tags')
        .select('*');

      if (error) throw error;
      setProductTags(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch product tags",
        variant: "destructive",
      });
    }
  };

  const uploadImage = async (file: File) => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setNewProduct(prev => ({ ...prev, image: imageUrl }));
    }
  };

  const addWeightOption = () => {
    setWeightOptions([...weightOptions, { weight: 0, mrp: 0, selling_price: 0, unit: newProduct.weight_unit }]);
  };

  const updateWeightOption = (index: number, field: keyof WeightOption, value: string | number) => {
    const updated = weightOptions.map((option, i) => 
      i === index ? { ...option, [field]: field === 'unit' ? value : Number(value) } : option
    );
    setWeightOptions(updated);
  };

  const removeWeightOption = (index: number) => {
    setWeightOptions(weightOptions.filter((_, i) => i !== index));
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.mrp || !newProduct.selling_price) {
      toast({
        title: "Invalid Product",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Insert the product
      const { data: productData, error } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          mrp: parseFloat(newProduct.mrp),
          selling_price: parseFloat(newProduct.selling_price),
          price: parseFloat(newProduct.selling_price), // Keep legacy price field
          description: newProduct.description || null,
          image: newProduct.image || null,
          // keep legacy string for now based on selected category_id
          category: newProduct.category_id ? (categories.find(c => c.id === newProduct.category_id)?.name || null) : (newProduct.category || null),
          category_id: newProduct.category_id || null,
          stock: parseInt(newProduct.stock) || 0,
          info: newProduct.info || null,
          base_weight: parseFloat(newProduct.base_weight) || 500,
          weight_unit: newProduct.weight_unit || 'grams',
          weight_options: weightOptions.length > 0 ? JSON.stringify(weightOptions) : null,
          site_display: newProduct.site_display
        }] as any)
        .select()
        .single();

      if (error) throw error;

      // Add product tags if any are selected
      if (selectedProductTags.length > 0 && productData) {
        const productTagData = selectedProductTags.map(tagId => ({
          product_id: productData.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('product_tags')
          .insert(productTagData);

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: "Product added successfully",
      });

      setNewProduct({
        name: "",
        mrp: "",
        selling_price: "",
        description: "",
        image: "",
        category: "",
        category_id: "",
        stock: "",
        info: "",
        base_weight: "500",
        weight_unit: "grams",
        site_display: true
      });
      setWeightOptions([]);
      setSelectedProductTags([]);
      setIsAddProductOpen(false);
      fetchProducts();
      fetchProductTags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      mrp: product.mrp.toString(),
      selling_price: product.selling_price.toString(),
      description: product.description || "",
      image: product.image || "",
      category: product.category || "",
      category_id: product.category_id || "",
      stock: product.stock.toString(),
      info: product.info || "",
      base_weight: product.base_weight?.toString() || "500",
      weight_unit: product.weight_unit || "grams",
      site_display: Boolean(product.site_display)
    });
    setEditWeightOptions(product.weight_options || []);
    
    // Get current product tags
    const currentProductTags = getProductTags(product.id);
    setEditSelectedProductTags(currentProductTags.map(tag => tag.id));
    
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !newProduct.name || !newProduct.mrp || !newProduct.selling_price) {
      toast({
        title: "Invalid Product",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the product
      const { error } = await supabase
        .from('products')
        .update({
          name: newProduct.name,
          mrp: parseFloat(newProduct.mrp),
          selling_price: parseFloat(newProduct.selling_price),
          description: newProduct.description || null,
          image: newProduct.image || null,
          category: newProduct.category || null,
          category_id: newProduct.category_id || null,
          stock: parseInt(newProduct.stock) || 0,
          info: newProduct.info || null,
          base_weight: parseFloat(newProduct.base_weight) || 500,
          weight_unit: newProduct.weight_unit || 'grams',
          weight_options: editWeightOptions.length > 0 ? JSON.stringify(editWeightOptions) : null,
          site_display: newProduct.site_display
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      // Update product tags
      // First, delete existing product tags
      const { error: deleteError } = await supabase
        .from('product_tags')
        .delete()
        .eq('product_id', editingProduct.id);

      if (deleteError) throw deleteError;

      // Then, add new product tags if any are selected
      if (editSelectedProductTags.length > 0) {
        const productTagData = editSelectedProductTags.map(tagId => ({
          product_id: editingProduct.id,
          tag_id: tagId
        }));

        const { error: tagError } = await supabase
          .from('product_tags')
          .insert(productTagData);

        if (tagError) throw tagError;
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setNewProduct({
        name: "",
        mrp: "",
        selling_price: "",
        description: "",
        image: "",
        category: "",
        category_id: "",
        stock: "",
        info: "",
        base_weight: "500",
        weight_unit: "grams",
        site_display: true
      });
      setEditWeightOptions([]);
      setEditSelectedProductTags([]);
      setEditingProduct(null);
      setIsEditProductOpen(false);
      fetchProducts();
      fetchProductTags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) {
      toast({
        title: "Invalid User",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newUser.email)
        .single();

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: newUser.full_name,
            phone: newUser.phone || null,
            address: newUser.address || null
          })
          .eq('id', existingUser.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Existing user updated successfully",
        });
      } else {
        // Create new user
        if (!newUser.password) {
          toast({
            title: "Invalid User",
            description: "Password is required for new users.",
            variant: "destructive"
          });
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: newUser.email,
          password: newUser.password,
          options: {
            data: {
              full_name: newUser.full_name,
              phone: newUser.phone,
              address: newUser.address
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "User created successfully",
        });
      }

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: ""
      });
      setIsAddUserOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setNewUser({
      email: user.email || "",
      password: "",
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || ""
    });
    setIsEditUserOpen(true);
  };

  const [orderDetailsDialog, setOrderDetailsDialog] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{order: Order | null, items: OrderItem[]}>({order: null, items: []});
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showOrders, setShowOrders] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{x: number, y: number, data: any, type: 'orders' | 'revenue'} | null>(null);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({
    businessName: "❤️ PRIYUM",
    businessSubtitle: "Cakes & Bakes",
    phone: "+91 98765 43210",
    email: "orders@priyumbakes.com",
    orderDate: new Date().toLocaleDateString(),
    invoiceDate: new Date().toLocaleDateString()
  });

  const handleViewOrderDetails = async (orderId: string) => {
    try {
      // Fetch complete order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setOrderDetails({order, items: orderItems || []});
      setOrderDetailsDialog(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, orderTotal: number) => {
    if (!confirm('Are you sure you want to delete this order? This will reduce the total revenue.')) {
      return;
    }

    try {
      // Delete order items first
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast({
        title: "Success",
        description: `Order deleted successfully. Revenue reduced by ₹${orderTotal}`,
      });
      
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleEditOrder = async (orderId: string) => {
    try {
      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      setEditingOrder(order);
      setEditingOrderItems(orderItems || []);
      setIsEditOrderOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order for editing",
        variant: "destructive",
      });
    }
  };

  const handleUpdateOrder = async () => {
    if (!editingOrder) return;

    try {
      // Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: editingOrder.customer_name,
          customer_email: editingOrder.customer_email,
          customer_phone: editingOrder.customer_phone,
          customer_address: editingOrder.customer_address,
          subtotal: editingOrder.subtotal,
          shipping_charges: editingOrder.shipping_charges,
          discount_amount: editingOrder.discount_amount,
          total: editingOrder.total,
          custom_order_date: editingOrder.custom_order_date,
          custom_invoice_date: editingOrder.custom_invoice_date,
          delivery_date: editingOrder.delivery_date,
          shipment_number: editingOrder.shipment_number
        })
        .eq('id', editingOrder.id);

      if (orderError) throw orderError;

      // Update order items
      for (const item of editingOrderItems) {
        const { error: itemError } = await supabase
          .from('order_items')
          .update({
            product_name: item.product_name,
            product_price: item.product_price,
            quantity: item.quantity,
            total: item.total,
            weight: item.weight,
            weight_unit: item.weight_unit
          })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      setIsEditOrderOpen(false);
      setEditingOrder(null);
      setEditingOrderItems([]);
      fetchOrders();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.full_name) {
      toast({
        title: "Invalid User",
        description: "Please fill in the required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: newUser.full_name,
          phone: newUser.phone || null,
          address: newUser.address || null
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setNewUser({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        address: ""
      });
      setEditingUser(null);
      setIsEditUserOpen(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // Tag Management Functions
  const handleAddTag = async () => {
    if (!newTag.name.trim()) {
      toast({
        title: "Invalid Tag",
        description: "Please enter a tag name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .insert([{
          name: newTag.name.trim(),
          color: newTag.color
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag added successfully",
      });

      setNewTag({ name: "", color: "#3B82F6" });
      setIsAddTagOpen(false);
      fetchTags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setNewTag({
      name: tag.name,
      color: tag.color
    });
    setIsEditTagOpen(true);
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !newTag.name.trim()) {
      toast({
        title: "Invalid Tag",
        description: "Please enter a tag name.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tags')
        .update({
          name: newTag.name.trim(),
          color: newTag.color
        })
        .eq('id', editingTag.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag updated successfully",
      });

      setNewTag({ name: "", color: "#3B82F6" });
      setEditingTag(null);
      setIsEditTagOpen(false);
      fetchTags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      // First delete all product associations
      const { error: productTagsError } = await supabase
        .from('product_tags')
        .delete()
        .eq('tag_id', tagId);

      if (productTagsError) throw productTagsError;

      // Then delete the tag
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
      fetchTags();
      fetchProductTags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  // Base Category Handlers
  const handleAddBaseCategory = async () => {
    if (!newBaseCategory.name || !newBaseCategory.display_name) {
      toast({
        title: "Invalid Base Category",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('base_categories' as any)
        .insert({ name: newBaseCategory.name, display_name: newBaseCategory.display_name });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Base category added successfully",
      });

      setNewBaseCategory({ name: "", display_name: "" });
      setIsAddBaseCategoryOpen(false);
      fetchBaseCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add base category",
        variant: "destructive",
      });
    }
  };

  const handleEditBaseCategory = (baseCategory: { id: string; name: string; display_name: string }) => {
    setEditingBaseCategory(baseCategory);
    setNewBaseCategory({ name: baseCategory.name, display_name: baseCategory.display_name });
    setIsEditBaseCategoryOpen(true);
  };

  const handleUpdateBaseCategory = async () => {
    if (!editingBaseCategory || !newBaseCategory.name || !newBaseCategory.display_name) {
      toast({
        title: "Invalid Base Category",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('base_categories' as any)
        .update({ name: newBaseCategory.name, display_name: newBaseCategory.display_name })
        .eq('id', editingBaseCategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Base category updated successfully",
      });

      setNewBaseCategory({ name: "", display_name: "" });
      setEditingBaseCategory(null);
      setIsEditBaseCategoryOpen(false);
      fetchBaseCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update base category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBaseCategory = async (baseCategoryId: string) => {
    if (!confirm('Are you sure you want to delete this base category? Categories linked to it will have their link removed.')) {
      return;
    }

    try {
      // First, remove base_category_id from all categories linked to this base category
      await supabase
        .from('categories' as any)
        .update({ base_category_id: null })
        .eq('base_category_id', baseCategoryId);

      // Then delete the base category
      const { error } = await supabase
        .from('base_categories' as any)
        .delete()
        .eq('id', baseCategoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Base category deleted successfully",
      });
      fetchBaseCategories();
      fetchCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete base category",
        variant: "destructive",
      });
    }
  };

  // Category Handlers
  const handleEditCategory = (category: { id: string; name: string; display_name: string; base_category_id?: string | null }) => {
    setEditingCategory(category);
    setNewCategory({ name: category.name, display_name: category.display_name, base_category_id: category.base_category_id || "" });
    setIsEditCategoryOpen(true);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !newCategory.name || !newCategory.display_name) {
      toast({
        title: "Invalid Category",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('categories' as any)
        .update({ 
          name: newCategory.name, 
          display_name: newCategory.display_name,
          base_category_id: newCategory.base_category_id || null
        })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category updated successfully",
      });

      setNewCategory({ name: "", display_name: "", base_category_id: "" });
      setEditingCategory(null);
      setIsEditCategoryOpen(false);
      fetchCategories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Products linked to it will have their category removed.')) {
      return;
    }

    try {
      // First, remove category_id from all products linked to this category
      await (supabase as any)
        .from('products')
        .update({ category_id: null })
        .eq('category_id', categoryId);

      // Then delete the category
      const { error } = await supabase
        .from('categories' as any)
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
      fetchCategories();
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Helper function to get tags for a product
  const getProductTags = (productId: string) => {
    const productTagIds = productTags
      .filter(pt => pt.product_id === productId)
      .map(pt => pt.tag_id);
    
    return tags.filter(tag => productTagIds.includes(tag.id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const getTotalStats = () => {
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pendingOrders = orders.filter(order => order.status === "pending").length;
    const shippedOrders = orders.filter(order => order.status === "shipped").length;

    return { totalProducts, totalOrders, totalRevenue, pendingOrders, shippedOrders };
  };

  const stats = getTotalStats();

  const formatStatus = (status: string) => {
    return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getStatusAnimation = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
            <span className="text-xs text-yellow-600">⏰</span>
          </div>
        );
      case "preparing":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-whisk-rotate h-4 w-4 text-blue-600">🥄</div>
            <span className="text-xs text-blue-600">Whisking</span>
          </div>
        );
      case "ready":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-package-bounce h-4 w-4 text-green-600">📦</div>
            <span className="text-xs text-green-600">Packed</span>
          </div>
        );
      case "shipped":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-truck-move h-4 w-4 text-blue-600">🚚</div>
            <span className="text-xs text-blue-600">Moving</span>
          </div>
        );
      case "delivered":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-heart-eyes h-4 w-4 text-pink-600">😍</div>
            <span className="text-xs text-pink-600">Delivered</span>
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 text-red-500">❌</div>
            <span className="text-xs text-red-500">Cancelled</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 bg-gray-500 rounded-full"></div>
            <span className="text-xs text-gray-500">Unknown</span>
          </div>
        );
    }
  };

  const loadInvoiceSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading invoice settings:', error);
        return;
      }

      if (data) {
        setInvoiceSettings({
          businessName: data.business_name,
          businessSubtitle: data.business_subtitle,
          phone: data.phone,
          email: data.email,
          orderDate: formatDate(new Date().toISOString()),
          invoiceDate: formatDate(new Date().toISOString())
        });
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
    }
  };

  // Round prices for invoice generation
  const roundPrice = (price: number): number => {
    const decimal = price - Math.floor(price);
    if (decimal >= 0.5) {
      return Math.ceil(price);
    } else {
      return Math.floor(price);
    }
  };

  const generateOrderPDFFromTable = async (order: Order) => {
    setIsGeneratingPDF(true);

    try {
      // Fetch order items for this order
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      await generateOrderPDF(order, orderItems || []);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  const generateOrderPDF = async (order: Order, items: OrderItem[]) => {
    try {
      // Dynamic import for jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a temporary HTML element for PDF generation
      const invoiceHtml = document.createElement('div');
      invoiceHtml.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: white; width: 600px;">
          <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #d4a574; padding-bottom: 15px;">
            <div style="color: #8b4513; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${invoiceSettings.businessName}</div>
            <div style="color: #d4a574; font-size: 12px;">${invoiceSettings.businessSubtitle}</div>
            <div style="margin-top: 8px; color: #666; font-size: 10px;">
              📞 ${invoiceSettings.phone} | 📧 ${invoiceSettings.email}
            </div>
            <div style="margin-top: 8px; font-size: 12px;">Invoice #INV-${order.id.slice(0, 8)}</div>
            <div style="font-size: 10px; color: #666;">Order ID: ${order.id}</div>
            <div style="font-size: 10px; color: #666;">Invoice Date: ${order.custom_invoice_date ? formatDate(order.custom_invoice_date) : formatDate(new Date().toISOString())}</div>
            <div style="font-size: 10px; color: #666;">Order Date: ${order.custom_order_date ? formatDate(order.custom_order_date) : formatDate(order.order_date)}</div>
          </div>
          
          <div style="margin: 15px 0; padding: 10px; background: #f9f7f4; border-radius: 5px;">
            <h3 style="color: #8b4513; margin-bottom: 8px; font-size: 14px;">Customer Details:</h3>
            <p style="margin: 3px 0; font-size: 11px;"><strong>Name:</strong> ${order.customer_name}</p>
            <p style="margin: 3px 0; font-size: 11px;"><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
            <p style="margin: 3px 0; font-size: 11px;"><strong>Address:</strong> ${order.customer_address || 'N/A'}</p>
            ${order.delivery_date ? `<p style="margin: 3px 0; font-size: 11px;"><strong>Delivery Date:</strong> ${formatDate(order.delivery_date)}</p>` : ''}
            ${order.shipment_number ? `<p style="margin: 3px 0; font-size: 11px;"><strong>Shipment Number:</strong> ${order.shipment_number}</p>` : ''}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10px;">
            <thead>
              <tr style="background: #d4a574; color: white;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Weight</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Qty</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => {
                // Remove weight from product name (format: "Product Name (120grams)" or "Product Name (Category) (120grams)")
                // Only remove patterns with numbers followed by units (grams, kg, pieces, etc.)
                // Preserve category patterns (text-only in parentheses)
                const baseProductName = item.product_name.replace(/\s*\(\d+[^)]*(?:grams?|kg|pieces?|g|ml|l|oz|lb)[^)]*\)\s*$/i, '');
                
                return `
                <tr>
                  <td style="padding: 6px; border-bottom: 1px solid #ddd;">${baseProductName}</td>
                  <td style="padding: 6px; border-bottom: 1px solid #ddd;">${item.weight ? `${item.weight} ${item.weight_unit}` : 'N/A'}</td>
                  <td style="padding: 6px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
                  <td style="padding: 6px; border-bottom: 1px solid #ddd;">₹${roundPrice(item.product_price)}</td>
                  <td style="padding: 6px; border-bottom: 1px solid #ddd;">₹${roundPrice(item.total)}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; text-align: right;">
            <div style="margin: 3px 0; font-size: 11px;">
              <span>Subtotal: ₹${roundPrice(order.subtotal || 0)}</span>
            </div>
            <div style="margin: 3px 0; font-size: 11px;">
              <span>Shipping: ₹${roundPrice(order.shipping_charges || 0)}</span>
            </div>
            ${order.discount_amount && order.discount_amount > 0 ? `
              <div style="margin: 3px 0; font-size: 11px;">
                <span>Discount: -₹${roundPrice(order.discount_amount)}</span>
              </div>
            ` : ''}
            <div style="font-size: 14px; font-weight: bold; color: #8b4513; border-top: 2px solid #d4a574; padding-top: 8px; margin-top: 8px;">
              Total Amount: ₹${roundPrice(order.total)}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 10px;">
            <p>Thank you for choosing PRIYUM Cakes & Bakes!</p>
            <p>Order Date: ${formatDate(order.order_date)}</p>
            <p>Made with ❤️ for delicious moments</p>
          </div>
        </div>
      `;

      // Temporarily add to DOM for rendering
      invoiceHtml.style.position = 'absolute';
      invoiceHtml.style.left = '-9999px';
      document.body.appendChild(invoiceHtml);

      // Convert to canvas then PDF with optimized settings for smaller file size
      const canvas = await html2canvas(invoiceHtml, {
        scale: 1.5, // Reduced from 2 to 1.5 for smaller file size
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
        logging: false,
        removeContainer: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality instead of PNG
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190; // Reduced from 210 to 190 for better fit
      const pageHeight = 277; // Reduced from 295 to 277 for better fit
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight); // Added 10px margin
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Clean up
      if (invoiceHtml.parentNode) {
        invoiceHtml.parentNode.removeChild(invoiceHtml);
      }

      // Download PDF with customer name and order ID in filename
      const safeCustomerName = order.customer_name.replace(/[^a-zA-Z0-9]/g, '-');
      pdf.save(`${safeCustomerName}-invoice-${order.id.slice(0, 8)}.pdf`);

      toast({
        title: "PDF Invoice Generated! 🎉",
        description: "Invoice downloaded successfully.",
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF invoice. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your bakehouse products and orders</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Back to Store
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Download className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-warm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Shipped Orders</p>
                  <p className="text-2xl font-bold text-foreground">{stats.shippedOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-2xl">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="space-y-6">
              {/* Category Selection Card */}
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle>Choose Category</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <div className="inline-flex w-max min-w-full gap-1 h-auto">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.name)}
                          className={`text-xs py-2 px-3 whitespace-nowrap flex-shrink-0 rounded-md transition-colors ${
                            selectedCategory === category.name
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                          }`}
                        >
                          {category.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Management Card */}
              <Card className="shadow-warm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Product Management</CardTitle>
                    <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="productName">Product Name</Label>
                          <Input
                            id="productName"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter product name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productMRP">MRP (₹)</Label>
                          <Input
                            id="productMRP"
                            type="number"
                            value={newProduct.mrp}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, mrp: e.target.value }))}
                            placeholder="350"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productSellingPrice">Selling Price (₹)</Label>
                          <Input
                            id="productSellingPrice"
                            type="number"
                            value={newProduct.selling_price}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, selling_price: e.target.value }))}
                            placeholder="299"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productCategory">Category</Label>
                          <Select
                            value={newProduct.category_id}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, category_id: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(category => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 text-right">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCategoryOpen(true)}>
                              <Plus className="w-3 h-3 mr-1" /> Add Category
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="productStock">Stock Quantity</Label>
                          <Input
                            id="productStock"
                            type="number"
                            value={newProduct.stock}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                            placeholder="50"
                          />
                        </div>
                        
                        {/* Base Weight and Unit */}
                        <div>
                          <Label htmlFor="baseWeight">Base Weight</Label>
                          <Input
                            id="baseWeight"
                            type="number"
                            value={newProduct.base_weight}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, base_weight: e.target.value }))}
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="weightUnit">Weight Unit</Label>
                          <Select
                            value={newProduct.weight_unit}
                            onValueChange={(value) => setNewProduct(prev => ({ ...prev, weight_unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {weightUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="productDescription">Description</Label>
                          <Textarea
                            id="productDescription"
                            value={newProduct.description}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Enter product description"
                            rows={3}
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <div className="flex items-center justify-between py-2">
                            <Label htmlFor="siteDisplay">Show on Site</Label>
                            <Switch
                              id="siteDisplay"
                              checked={newProduct.site_display}
                              onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, site_display: checked }))}
                            />
                          </div>
                        </div>

                        <div className="col-span-2">
                          <Label htmlFor="productInfo">Additional Information</Label>
                          <Textarea
                            id="productInfo"
                            value={newProduct.info}
                            onChange={(e) => setNewProduct(prev => ({ ...prev, info: e.target.value }))}
                            placeholder="Enter additional information about the product"
                            rows={2}
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label>Tags</Label>
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {tags.map((tag) => (
                              <div key={tag.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`tag-${tag.id}`}
                                  checked={selectedProductTags.includes(tag.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductTags([...selectedProductTags, tag.id]);
                                    } else {
                                      setSelectedProductTags(selectedProductTags.filter(id => id !== tag.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <label 
                                  htmlFor={`tag-${tag.id}`}
                                  className="flex items-center space-x-1 text-sm cursor-pointer"
                                >
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span>{tag.name}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Image Upload */}
                        <div className="col-span-2">
                          <Label>Product Image</Label>
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploadingImage}
                            />
                            {uploadingImage && (
                              <p className="text-sm text-muted-foreground">Uploading image...</p>
                            )}
                            {newProduct.image && (
                              <img 
                                src={newProduct.image} 
                                alt="Preview" 
                                className="w-20 h-20 object-cover rounded"
                              />
                            )}
                          </div>
                        </div>

                        {/* Weight Options */}
                        <div className="col-span-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label>Weight & Price Options</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addWeightOption}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {weightOptions.map((option, index) => (
                              <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                                <Input
                                  type="number"
                                  placeholder="Weight"
                                  value={option.weight}
                                  onChange={(e) => updateWeightOption(index, 'weight', e.target.value)}
                                  className="w-20"
                                />
                                <Select
                                  value={option.unit}
                                  onValueChange={(value) => updateWeightOption(index, 'unit', value)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {weightUnits.map(unit => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="MRP"
                                  value={option.mrp}
                                  onChange={(e) => updateWeightOption(index, 'mrp', e.target.value)}
                                  className="w-20"
                                />
                                <Input
                                  type="number"
                                  placeholder="Selling Price"
                                  value={option.selling_price}
                                  onChange={(e) => updateWeightOption(index, 'selling_price', e.target.value)}
                                  className="w-20"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeWeightOption(index)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddProduct}>
                            Add Product
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const currentCategory = categories.find(cat => cat.name === selectedCategory);
                    if (!currentCategory) return null;
                    
                    const categoryProducts = products.filter(p => 
                      (p.category_id ? p.category_id === currentCategory.id : p.category === currentCategory.name)
                    );
                    
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-xl font-semibold">
                            {currentCategory.display_name} Products
                          </h4>
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {categoryProducts.length} products
                          </Badge>
                        </div>
                        
                        {categoryProducts.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-lg">No products in this category yet.</p>
                              <p className="text-sm">Add a new product to get started.</p>
                            </div>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Weight Options</TableHead>
                                <TableHead>Tags</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {categoryProducts.map((product) => (
                                <TableRow key={product.id}>
                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <img
                                        src={product.image || "/placeholder.svg"}
                                        alt={product.name}
                                        className="w-12 h-12 object-cover rounded-lg"
                                      />
                                      <div>
                                        <p className="font-medium">{product.name}</p>
                                        <p className="text-sm text-muted-foreground">{product.description}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-bold">₹{product.selling_price}</span>
                                      {product.mrp > product.selling_price && (
                                        <span className="text-xs text-muted-foreground line-through">₹{product.mrp}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <p>Base: {product.base_weight} {product.weight_unit}</p>
                                      {product.weight_options && product.weight_options.length > 0 && (
                                        <p className="text-muted-foreground">
                                          +{product.weight_options.length} options
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {getProductTags(product.id).map((tag) => (
                                        <Badge 
                                          key={tag.id} 
                                          variant="outline" 
                                          className="text-xs"
                                          style={{ 
                                            borderColor: tag.color, 
                                            color: tag.color,
                                            backgroundColor: `${tag.color}10`
                                          }}
                                        >
                                          {tag.name}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                                      {product.stock} units
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditProduct(product)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteProduct(product.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card className="shadow-warm">
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                         <TableCell>
                           <div>
                             <p className="font-medium">{order.customer_name}</p>
                             <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="space-y-1">
                             <p className="text-sm">Order Details</p>
                           </div>
                         </TableCell>
                         <TableCell className="font-medium">₹{order.total}</TableCell>
                         <TableCell>
                           <div className="flex items-center space-x-2">
                             <Select
                               value={order.status}
                               onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                             >
                               <SelectTrigger className="w-32">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="pending">Pending</SelectItem>
                                 <SelectItem value="preparing">Preparing</SelectItem>
                                 <SelectItem value="ready">Ready</SelectItem>
                                 <SelectItem value="shipped">Shipped</SelectItem>
                                 <SelectItem value="delivered">Delivered</SelectItem>
                                 <SelectItem value="cancelled">Cancelled</SelectItem>
                               </SelectContent>
                             </Select>
                             {getStatusAnimation(order.status)}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm">
                             {order.shipment_number ? (
                               <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                                 {order.shipment_number}
                               </span>
                             ) : (
                               <span className="text-muted-foreground text-xs">Not set</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div className="text-sm">
                             {order.delivery_date ? (
                               <span className="text-foreground">{formatDate(order.delivery_date)}</span>
                             ) : (
                               <span className="text-muted-foreground text-xs">Not set</span>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>{formatDate(order.order_date)}</TableCell>
                         <TableCell>
                           <div className="flex space-x-2">
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => handleViewOrderDetails(order.id)}
                             >
                               View Details
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => handleEditOrder(order.id)}
                             >
                               <Edit className="w-4 h-4" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => generateOrderPDFFromTable(order)}
                               disabled={isGeneratingPDF}
                             >
                               <Download className="w-4 h-4" />
                             </Button>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleDeleteOrder(order.id, order.total)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {/* Sales Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="shadow-warm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="text-2xl font-bold text-foreground">₹{orders.reduce((sum, order) => sum + order.total, 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-warm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Package className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-warm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Users className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Customers</p>
                        <p className="text-2xl font-bold text-foreground">{users.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-warm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-2">
                      <Package className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-2xl font-bold text-foreground">{products.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Chart */}
              <Card className="shadow-warm">
                <CardHeader>
                  <CardTitle>Sales Report</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Monthly Sales Line Chart */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Weekly Trends</h3>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="show-orders" 
                              checked={showOrders} 
                              onCheckedChange={(checked) => setShowOrders(checked === true)}
                            />
                            <Label htmlFor="show-orders" className="text-sm">Show Orders</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="show-revenue" 
                              checked={showRevenue} 
                              onCheckedChange={(checked) => setShowRevenue(checked === true)}
                            />
                            <Label htmlFor="show-revenue" className="text-sm">Show Revenue</Label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="h-80 bg-muted/20 p-6 rounded-lg relative">
                        {(() => {
                          // Group orders by week
                          const weeklyData = orders.reduce((acc, order) => {
                            const date = new Date(order.order_date);
                            const weekStart = new Date(date);
                            weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                            const weekKey = weekStart.toISOString().split('T')[0];
                            const weekName = `Week ${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('en-US', { month: 'short' })}`;
                            
                            if (!acc[weekKey]) {
                              acc[weekKey] = {
                                week: weekName,
                                orders: 0,
                                revenue: 0
                              };
                            }
                            acc[weekKey].orders += 1;
                            acc[weekKey].revenue += order.total;
                            return acc;
                          }, {} as Record<string, {week: string, orders: number, revenue: number}>);
                          
                          const sortedWeeks = Object.values(weeklyData).sort((a, b) => {
                            const aDate = new Date(a.week.split(' ')[1] + ' ' + a.week.split(' ')[2]);
                            const bDate = new Date(b.week.split(' ')[1] + ' ' + b.week.split(' ')[2]);
                            return aDate.getTime() - bDate.getTime();
                          });
                          
                          if (sortedWeeks.length === 0) {
                            return (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <div className="text-center">
                                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p>No data available</p>
                                </div>
                              </div>
                            );
                          }
                          
                          // Standardize Y-axis with 10,000 increments
                          const maxOrders = Math.max(...sortedWeeks.map(w => w.orders));
                          const maxRevenue = Math.max(...sortedWeeks.map(w => w.revenue));
                          const maxValue = Math.max(maxOrders, maxRevenue);
                          const yAxisMax = Math.ceil(maxValue / 10000) * 10000;
                          
                          // Create SVG line chart with improved spacing
                          const width = 800; // Increased width for better spacing
                          const height = 300; // Increased height for better visibility
                          const padding = 60; // Increased padding
                          const chartWidth = width - padding * 2;
                          const chartHeight = height - padding * 2;
                          
                          // Calculate minimum spacing between points
                          const minSpacing = 80; // Minimum 80px between points
                          const totalSpacing = Math.max(chartWidth, (sortedWeeks.length - 1) * minSpacing);
                          const pointSpacing = totalSpacing / (sortedWeeks.length - 1);
                          
                          const points = sortedWeeks.map((week, index) => {
                            const x = padding + (index * pointSpacing);
                            const ordersY = padding + chartHeight - (week.orders / yAxisMax) * chartHeight;
                            const revenueY = padding + chartHeight - (week.revenue / yAxisMax) * chartHeight;
                            return { 
                              x, 
                              ordersY, 
                              revenueY, 
                              week: week.week, 
                              orders: week.orders, 
                              revenue: week.revenue 
                            };
                          });
                          
                          const ordersPath = points.map((point, index) => 
                            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.ordersY}`
                          ).join(' ');
                          
                          const revenuePath = points.map((point, index) => 
                            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.revenueY}`
                          ).join(' ');
                          
                          return (
                            <div className="relative">
                              <svg width={width} height={height} className="overflow-visible">
                                {/* Grid lines with standardized Y-axis */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                                  <g key={index}>
                                    <line
                                      x1={padding}
                                      y1={padding + ratio * chartHeight}
                                      x2={padding + totalSpacing}
                                      y2={padding + ratio * chartHeight}
                                      stroke="currentColor"
                                      strokeWidth="1"
                                      opacity="0.1"
                                    />
                                    <text
                                      x={padding - 10}
                                      y={padding + ratio * chartHeight + 4}
                                      fontSize="10"
                                      fill="currentColor"
                                      opacity="0.6"
                                      textAnchor="end"
                                    >
                                      {Math.round(yAxisMax * (1 - ratio)).toLocaleString()}
                                    </text>
                                  </g>
                                ))}
                                
                                {/* X-axis labels */}
                                {points.map((point, index) => (
                                  <text
                                    key={index}
                                    x={point.x}
                                    y={height - 10}
                                    fontSize="10"
                                    fill="currentColor"
                                    opacity="0.6"
                                    textAnchor="middle"
                                  >
                                    {point.week}
                                  </text>
                                ))}
                                
                                {/* Orders line */}
                                {showOrders && (
                                  <g>
                                    <path
                                      d={ordersPath}
                                      fill="none"
                                      stroke="#3b82f6"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    {points.map((point, index) => (
                                      <circle
                                        key={`orders-${index}`}
                                        cx={point.x}
                                        cy={point.ordersY}
                                        r="6"
                                        fill="#3b82f6"
                                        className="cursor-pointer transition-all hover:r-8"
                                        onMouseEnter={() => setHoveredPoint({
                                          x: point.x,
                                          y: point.ordersY,
                                          data: { week: point.week, value: point.orders },
                                          type: 'orders'
                                        })}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                      />
                                    ))}
                                  </g>
                                )}
                                
                                {/* Revenue line */}
                                {showRevenue && (
                                  <g>
                                    <path
                                      d={revenuePath}
                                      fill="none"
                                      stroke="#10b981"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    {points.map((point, index) => (
                                      <circle
                                        key={`revenue-${index}`}
                                        cx={point.x}
                                        cy={point.revenueY}
                                        r="6"
                                        fill="#10b981"
                                        className="cursor-pointer transition-all hover:r-8"
                                        onMouseEnter={() => setHoveredPoint({
                                          x: point.x,
                                          y: point.revenueY,
                                          data: { week: point.week, value: point.revenue },
                                          type: 'revenue'
                                        })}
                                        onMouseLeave={() => setHoveredPoint(null)}
                                      />
                                    ))}
                                  </g>
                                )}
                              </svg>
                              
                              {/* Hover Tooltip */}
                              {hoveredPoint && (
                                <div 
                                  className="absolute bg-background border border-border rounded-lg shadow-lg p-3 z-10 pointer-events-none"
                                  style={{
                                    left: `${hoveredPoint.x - 60}px`,
                                    top: `${hoveredPoint.y - 60}px`,
                                    transform: 'translateX(-50%)'
                                  }}
                                >
                                  <div className="text-sm font-medium">
                                    {hoveredPoint.data.week}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {hoveredPoint.type === 'orders' ? 'Orders' : 'Revenue'}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {hoveredPoint.type === 'orders' 
                                      ? hoveredPoint.data.value 
                                      : `₹${hoveredPoint.data.value.toLocaleString()}`
                                    }
                                  </div>
                                </div>
                              )}
                              
                              {/* Legend */}
                              <div className="flex items-center justify-center space-x-6 mt-4">
                                {showOrders && (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-sm text-muted-foreground">Orders</span>
                                  </div>
                                )}
                                {showRevenue && (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <span className="text-sm text-muted-foreground">Revenue (₹)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Order Status Distribution */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(() => {
                          const statusCounts = orders.reduce((acc, order) => {
                            acc[order.status] = (acc[order.status] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          const statusColors = {
                            pending: 'bg-yellow-500',
                            preparing: 'bg-blue-500',
                            ready: 'bg-green-500',
                            shipped: 'bg-purple-500',
                            delivered: 'bg-emerald-500',
                            cancelled: 'bg-red-500'
                          };
                          
                          return Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status} className="flex items-center space-x-3 p-3 bg-background rounded-lg border">
                              <div className={`w-4 h-4 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium capitalize">{status}</p>
                                <p className="text-xs text-muted-foreground">{count} orders</p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="shadow-warm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="userEmail">Email</Label>
                          <Input
                            id="userEmail"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userPassword">Password</Label>
                          <Input
                            id="userPassword"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userFullName">Full Name</Label>
                          <Input
                            id="userFullName"
                            value={newUser.full_name}
                            onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userPhone">Phone</Label>
                          <Input
                            id="userPhone"
                            value={newUser.phone}
                            onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Enter phone number"
                          />
                        </div>
                        <div>
                          <Label htmlFor="userAddress">Address</Label>
                          <Textarea
                            id="userAddress"
                            value={newUser.address}
                            onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Enter address"
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddUser}>
                            Add User
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email || 'N/A'}</TableCell>
                        <TableCell>{user.phone || 'N/A'}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.user_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card className="shadow-warm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tag Management</CardTitle>
                  <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tag
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Tag</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="tagName">Tag Name</Label>
                          <Input
                            id="tagName"
                            value={newTag.name}
                            onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter tag name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tagColor">Color</Label>
                          <div className="flex items-center space-x-2">
                            <Input
                              id="tagColor"
                              type="color"
                              value={newTag.color}
                              onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                              className="w-16 h-10"
                            />
                            <Input
                              value={newTag.color}
                              onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="#3B82F6"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setIsAddTagOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddTag}>
                            Add Tag
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tags.map((tag) => {
                      const productCount = productTags.filter(pt => pt.tag_id === tag.id).length;
                      return (
                        <TableRow key={tag.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="font-medium">{tag.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-6 h-6 rounded border" 
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="text-sm font-mono">{tag.color}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {productCount} {productCount === 1 ? 'product' : 'products'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(tag.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTag(tag)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteTag(tag.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="space-y-6">
              {/* Base Categories Section */}
              <Card className="shadow-warm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Base Categories</CardTitle>
                    <Dialog open={isAddBaseCategoryOpen} onOpenChange={setIsAddBaseCategoryOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Base Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Base Category</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                          <div>
                            <Label htmlFor="baseCatName">System Name</Label>
                            <Input 
                              id="baseCatName" 
                              value={newBaseCategory.name} 
                              onChange={(e) => setNewBaseCategory(prev => ({ ...prev, name: e.target.value }))} 
                              placeholder="e.g. baked-goods" 
                            />
                          </div>
                          <div>
                            <Label htmlFor="baseCatDisplay">Display Name</Label>
                            <Input 
                              id="baseCatDisplay" 
                              value={newBaseCategory.display_name} 
                              onChange={(e) => setNewBaseCategory(prev => ({ ...prev, display_name: e.target.value }))} 
                              placeholder="e.g. Baked Goods" 
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddBaseCategoryOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddBaseCategory}>Add</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead>System Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {baseCategories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No base categories found
                          </TableCell>
                        </TableRow>
                      ) : (
                        baseCategories.map((baseCategory) => (
                          <TableRow key={baseCategory.id}>
                            <TableCell className="font-medium">{baseCategory.display_name}</TableCell>
                            <TableCell className="text-muted-foreground">{baseCategory.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleEditBaseCategory(baseCategory)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteBaseCategory(baseCategory.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Categories Section */}
              <Card className="shadow-warm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Categories</CardTitle>
                    <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Category
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add Category</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                          <div>
                            <Label htmlFor="catName">System Name</Label>
                            <Input 
                              id="catName" 
                              value={newCategory.name} 
                              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))} 
                              placeholder="e.g. brownies" 
                            />
                          </div>
                          <div>
                            <Label htmlFor="catDisplay">Display Name</Label>
                            <Input 
                              id="catDisplay" 
                              value={newCategory.display_name} 
                              onChange={(e) => setNewCategory(prev => ({ ...prev, display_name: e.target.value }))} 
                              placeholder="e.g. Brownies" 
                            />
                          </div>
                          <div>
                            <Label htmlFor="catBaseCategory">Base Category</Label>
                            <Select 
                              value={newCategory.base_category_id || "none"} 
                              onValueChange={(value) => setNewCategory(prev => ({ ...prev, base_category_id: value === "none" ? "" : value }))}
                            >
                              <SelectTrigger id="catBaseCategory">
                                <SelectValue placeholder="Select a base category (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {baseCategories.map((baseCat) => (
                                  <SelectItem key={baseCat.id} value={baseCat.id}>
                                    {baseCat.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                          <Button onClick={async () => {
                            if (!newCategory.name || !newCategory.display_name) return;
                            const { data: cat, error } = await supabase
                              .from('categories' as any)
                              .insert({ 
                                name: newCategory.name, 
                                display_name: newCategory.display_name,
                                base_category_id: newCategory.base_category_id || null
                              })
                              .select('id, name, display_name')
                              .single();
                            if (!error && cat) {
                              setIsAddCategoryOpen(false);
                              setNewCategory({ name: "", display_name: "", base_category_id: "" });
                              await fetchCategories();
                              toast({ title: 'Category added' });
                            } else {
                              toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
                            }
                          }}>Add</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Display Name</TableHead>
                        <TableHead>System Name</TableHead>
                        <TableHead>Base Category</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No categories found
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => {
                          const baseCategory = baseCategories.find(bc => bc.id === category.base_category_id);
                          return (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.display_name}</TableCell>
                              <TableCell className="text-muted-foreground">{category.name}</TableCell>
                              <TableCell>{baseCategory ? baseCategory.display_name : <span className="text-muted-foreground">None</span>}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleEditCategory(category)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(category.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Product Dialog */}
        <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editProductName">Product Name</Label>
                <Input
                  id="editProductName"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter product name"
                />
              </div>
              <div>
                <Label htmlFor="editProductMRP">MRP (₹)</Label>
                <Input
                  id="editProductMRP"
                  type="number"
                  value={newProduct.mrp}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, mrp: e.target.value }))}
                  placeholder="350"
                />
              </div>
              <div>
                <Label htmlFor="editProductSellingPrice">Selling Price (₹)</Label>
                <Input
                  id="editProductSellingPrice"
                  type="number"
                  value={newProduct.selling_price}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, selling_price: e.target.value }))}
                  placeholder="299"
                />
              </div>
              <div>
                <Label htmlFor="editProductCategory">Category</Label>
                <Select
                  value={newProduct.category_id}
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-right">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddCategoryOpen(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Category
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="editProductStock">Stock Quantity</Label>
                <Input
                  id="editProductStock"
                  type="number"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="50"
                />
              </div>
              
              <div>
                <Label htmlFor="editBaseWeight">Base Weight</Label>
                <Input
                  id="editBaseWeight"
                  type="number"
                  value={newProduct.base_weight}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, base_weight: e.target.value }))}
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="editWeightUnit">Weight Unit</Label>
                <Select
                  value={newProduct.weight_unit}
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, weight_unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightUnits.map(unit => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="editSiteDisplay">Show on Site</Label>
                  <Switch
                    id="editSiteDisplay"
                    checked={Boolean(newProduct.site_display)}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, site_display: checked }))}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="editProductDescription">Description</Label>
                <Textarea
                  id="editProductDescription"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="editProductInfo">Additional Information</Label>
                <Textarea
                  id="editProductInfo"
                  value={newProduct.info}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, info: e.target.value }))}
                  placeholder="Enter additional information about the product"
                  rows={2}
                />
              </div>
              
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {tags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-tag-${tag.id}`}
                        checked={editSelectedProductTags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditSelectedProductTags([...editSelectedProductTags, tag.id]);
                          } else {
                            setEditSelectedProductTags(editSelectedProductTags.filter(id => id !== tag.id));
                          }
                        }}
                        className="rounded"
                      />
                      <label 
                        htmlFor={`edit-tag-${tag.id}`}
                        className="flex items-center space-x-1 text-sm cursor-pointer"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <Label>Product Image</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-muted-foreground">Uploading image...</p>
                  )}
                  {newProduct.image && (
                    <img 
                      src={newProduct.image} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <Label>Weight & Price Options</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditWeightOptions([...editWeightOptions, { weight: 0, mrp: 0, selling_price: 0, unit: newProduct.weight_unit }])}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {editWeightOptions.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                      <Input
                        type="number"
                        placeholder="Weight"
                        value={option.weight}
                        onChange={(e) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, weight: Number(e.target.value) } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                        className="w-20"
                      />
                      <Select
                        value={option.unit}
                        onValueChange={(value) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, unit: value } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weightUnits.map(unit => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="MRP"
                        value={option.mrp}
                        onChange={(e) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, mrp: Number(e.target.value) } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Selling Price"
                        value={option.selling_price}
                        onChange={(e) => {
                          const updated = editWeightOptions.map((opt, i) => 
                            i === index ? { ...opt, selling_price: Number(e.target.value) } : opt
                          );
                          setEditWeightOptions(updated);
                        }}
                        className="w-20"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditWeightOptions(editWeightOptions.filter((_, i) => i !== index))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateProduct}>
                  Update Product
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editUserEmail">Email (Read-only)</Label>
                <Input
                  id="editUserEmail"
                  type="email"
                  value={newUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="editUserFullName">Full Name</Label>
                <Input
                  id="editUserFullName"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="editUserPhone">Phone</Label>
                <Input
                  id="editUserPhone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="editUserAddress">Address</Label>
                <Textarea
                  id="editUserAddress"
                  value={newUser.address}
                  onChange={(e) => setNewUser(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter address"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser}>
                  Update User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Tag Dialog */}
        <Dialog open={isEditTagOpen} onOpenChange={setIsEditTagOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTagName">Tag Name</Label>
                <Input
                  id="editTagName"
                  value={newTag.name}
                  onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tag name"
                />
              </div>
              <div>
                <Label htmlFor="editTagColor">Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="editTagColor"
                    type="color"
                    value={newTag.color}
                    onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10"
                  />
                  <Input
                    value={newTag.color}
                    onChange={(e) => setNewTag(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditTagOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateTag}>
                  Update Tag
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label htmlFor="catName">System Name</Label>
                <Input id="catName" value={newCategory.name} onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. brownies" />
              </div>
              <div>
                <Label htmlFor="catDisplay">Display Name</Label>
                <Input id="catDisplay" value={newCategory.display_name} onChange={(e) => setNewCategory(prev => ({ ...prev, display_name: e.target.value }))} placeholder="e.g. Brownies" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!newCategory.name || !newCategory.display_name) return;
                const { data: cat, error } = await supabase
                  .from('categories' as any)
                  .insert({ name: newCategory.name, display_name: newCategory.display_name })
                  .select('id, name, display_name')
                  .single();
                if (!error && cat) {
                  // Auto-select newly created category for the product form
                  const created = cat as any;
                  setNewProduct(prev => ({ ...prev, category_id: created.id, category: created.name }));
                  setIsAddCategoryOpen(false);
                  setNewCategory({ name: '', display_name: '', base_category_id: '' });
                  await fetchCategories();
                  toast({ title: 'Category added' });
                } else {
                  toast({ title: 'Error', description: 'Failed to add category', variant: 'destructive' });
                }
              }}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Base Category Dialog */}
        <Dialog open={isEditBaseCategoryOpen} onOpenChange={setIsEditBaseCategoryOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Base Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label htmlFor="editBaseCatName">System Name</Label>
                <Input 
                  id="editBaseCatName" 
                  value={newBaseCategory.name} 
                  onChange={(e) => setNewBaseCategory(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g. baked-goods" 
                />
              </div>
              <div>
                <Label htmlFor="editBaseCatDisplay">Display Name</Label>
                <Input 
                  id="editBaseCatDisplay" 
                  value={newBaseCategory.display_name} 
                  onChange={(e) => setNewBaseCategory(prev => ({ ...prev, display_name: e.target.value }))} 
                  placeholder="e.g. Baked Goods" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditBaseCategoryOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateBaseCategory}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label htmlFor="editCatName">System Name</Label>
                <Input 
                  id="editCatName" 
                  value={newCategory.name} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))} 
                  placeholder="e.g. brownies" 
                />
              </div>
              <div>
                <Label htmlFor="editCatDisplay">Display Name</Label>
                <Input 
                  id="editCatDisplay" 
                  value={newCategory.display_name} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, display_name: e.target.value }))} 
                  placeholder="e.g. Brownies" 
                />
              </div>
              <div>
                <Label htmlFor="editCatBaseCategory">Base Category</Label>
                <Select 
                  value={newCategory.base_category_id || "none"} 
                  onValueChange={(value) => setNewCategory(prev => ({ ...prev, base_category_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger id="editCatBaseCategory">
                    <SelectValue placeholder="Select a base category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {baseCategories.map((baseCat) => (
                      <SelectItem key={baseCat.id} value={baseCat.id}>
                        {baseCat.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateCategory}>Update</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Order Details Dialog */}
        <Dialog open={orderDetailsDialog} onOpenChange={setOrderDetailsDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {orderDetails.order && (
                <>
                  <div className="flex justify-end space-x-2 mb-4">
                    <Button
                      variant="outline"
                      onClick={() => handleEditOrder(orderDetails.order!.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Order
                    </Button>
                    <Button
                      onClick={() => generateOrderPDF(orderDetails.order!, orderDetails.items)}
                      disabled={isGeneratingPDF}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isGeneratingPDF ? "Generating..." : "Download PDF"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Customer Name</Label>
                      <p className="text-foreground">{orderDetails.order.customer_name}</p>
                    </div>
                    <div>
                      <Label>Customer Email</Label>
                      <p className="text-foreground">{orderDetails.order.customer_email}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-foreground">{orderDetails.order.customer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-foreground">₹{orderDetails.order.total}</p>
                    </div>
                    <div>
                      <Label>Subtotal</Label>
                      <p className="text-foreground">₹{orderDetails.order.subtotal || 0}</p>
                    </div>
                    <div>
                      <Label>Shipping Charges</Label>
                      <p className="text-foreground">₹{orderDetails.order.shipping_charges || 0}</p>
                    </div>
                    <div>
                      <Label>Discount Amount</Label>
                      <p className="text-foreground">₹{orderDetails.order.discount_amount || 0}</p>
                    </div>
                    <div>
                      <Label>Order Status</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{formatStatus(orderDetails.order.status)}</Badge>
                        {getStatusAnimation(orderDetails.order.status)}
                      </div>
                    </div>
                    <div>
                      <Label>Order Date</Label>
                      <p className="text-foreground">{orderDetails.order.custom_order_date ? formatDate(orderDetails.order.custom_order_date) : formatDate(orderDetails.order.order_date)}</p>
                    </div>
                    <div>
                      <Label>Invoice Date</Label>
                      <p className="text-foreground">{orderDetails.order.custom_invoice_date ? formatDate(orderDetails.order.custom_invoice_date) : formatDate(new Date().toISOString())}</p>
                    </div>
                    <div>
                      <Label>Delivery Date</Label>
                      <p className="text-foreground">{orderDetails.order.delivery_date ? formatDate(orderDetails.order.delivery_date) : 'Not specified'}</p>
                    </div>
                    <div>
                      <Label>Shipment Number</Label>
                      <p className="text-foreground">{orderDetails.order.shipment_number || 'Not specified'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Address</Label>
                    <p className="text-foreground">{orderDetails.order.customer_address || 'N/A'}</p>
                  </div>

                  <div>
                    <Label>Order Items ({orderDetails.items.length})</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell>{item.weight ? `${item.weight} ${item.weight_unit}` : 'N/A'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>₹{item.product_price}</TableCell>
                              <TableCell>₹{item.total}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Order Dialog */}
        <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Order</DialogTitle>
            </DialogHeader>
            {editingOrder && (
              <div className="space-y-6">
                {/* Customer Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editCustomerName">Customer Name</Label>
                    <Input
                      id="editCustomerName"
                      value={editingOrder.customer_name}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_name: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCustomerEmail">Customer Email</Label>
                    <Input
                      id="editCustomerEmail"
                      type="email"
                      value={editingOrder.customer_email}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_email: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editCustomerPhone">Phone</Label>
                    <Input
                      id="editCustomerPhone"
                      value={editingOrder.customer_phone || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_phone: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOrderStatus">Status</Label>
                    <Select
                      value={editingOrder.status}
                      onValueChange={(value) => setEditingOrder(prev => prev ? { ...prev, status: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editOrderDate">Order Date</Label>
                    <Input
                      id="editOrderDate"
                      type="date"
                      value={editingOrder.custom_order_date || new Date(editingOrder.order_date).toISOString().split('T')[0]}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, custom_order_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editInvoiceDate">Invoice Date</Label>
                    <Input
                      id="editInvoiceDate"
                      type="date"
                      value={editingOrder.custom_invoice_date || new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, custom_invoice_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDeliveryDate">Delivery Date</Label>
                    <Input
                      id="editDeliveryDate"
                      type="date"
                      value={editingOrder.delivery_date || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, delivery_date: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShippingCharges">Shipping Charges (₹)</Label>
                    <Input
                      id="editShippingCharges"
                      type="number"
                      min="0"
                      value={editingOrder.shipping_charges || 0}
                      onChange={(e) => {
                        const shipping = parseFloat(e.target.value) || 0;
                        const subtotal = editingOrder.subtotal || 0;
                        const discount = editingOrder.discount_amount || 0;
                        const total = roundPrice(subtotal + shipping - discount);
                        setEditingOrder(prev => prev ? { 
                          ...prev, 
                          shipping_charges: shipping,
                          total: total
                        } : null);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editDiscountAmount">Discount Amount (₹)</Label>
                    <Input
                      id="editDiscountAmount"
                      type="number"
                      min="0"
                      value={editingOrder.discount_amount || 0}
                      onChange={(e) => {
                        const discount = parseFloat(e.target.value) || 0;
                        const subtotal = editingOrder.subtotal || 0;
                        const shipping = editingOrder.shipping_charges || 0;
                        const total = roundPrice(subtotal + shipping - discount);
                        setEditingOrder(prev => prev ? { 
                          ...prev, 
                          discount_amount: discount,
                          total: total
                        } : null);
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editShipmentNumber">Shipment Number</Label>
                    <Input
                      id="editShipmentNumber"
                      placeholder="Enter tracking number"
                      value={editingOrder.shipment_number || ''}
                      onChange={(e) => setEditingOrder(prev => prev ? { ...prev, shipment_number: e.target.value } : null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="editCustomerAddress">Address</Label>
                  <Textarea
                    id="editCustomerAddress"
                    value={editingOrder.customer_address || ''}
                    onChange={(e) => setEditingOrder(prev => prev ? { ...prev, customer_address: e.target.value } : null)}
                    rows={3}
                  />
                </div>

                {/* Order Items */}
                <div>
                  <Label>Order Items</Label>
                  <div className="space-y-2">
                    {editingOrderItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-6 gap-2 p-3 border rounded">
                        <div>
                          <Label className="text-xs">Product Name</Label>
                          <Input
                            value={item.product_name}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].product_name = e.target.value;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Weight</Label>
                          <Input
                            type="number"
                            value={item.weight || ''}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].weight = parseFloat(e.target.value) || null;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Input
                            value={item.weight_unit || ''}
                            onChange={(e) => {
                              const updated = [...editingOrderItems];
                              updated[index].weight_unit = e.target.value;
                              setEditingOrderItems(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const quantity = parseInt(e.target.value) || 1;
                              const updated = [...editingOrderItems];
                              updated[index].quantity = quantity;
                              updated[index].total = roundPrice(item.product_price * quantity);
                              setEditingOrderItems(updated);
                              
                              // Recalculate order totals
                              const newSubtotal = updated.reduce((sum, i) => sum + i.total, 0);
                              const shipping = editingOrder.shipping_charges || 0;
                              const discount = editingOrder.discount_amount || 0;
                              const newTotal = roundPrice(newSubtotal + shipping - discount);
                              setEditingOrder(prev => prev ? { 
                                ...prev, 
                                subtotal: newSubtotal,
                                total: newTotal
                              } : null);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.product_price}
                            onChange={(e) => {
                              const price = parseFloat(e.target.value) || 0;
                              const updated = [...editingOrderItems];
                              updated[index].product_price = price;
                              updated[index].total = roundPrice(price * item.quantity);
                              setEditingOrderItems(updated);
                              
                              // Recalculate order totals
                              const newSubtotal = updated.reduce((sum, i) => sum + i.total, 0);
                              const shipping = editingOrder.shipping_charges || 0;
                              const discount = editingOrder.discount_amount || 0;
                              const newTotal = roundPrice(newSubtotal + shipping - discount);
                              setEditingOrder(prev => prev ? { 
                                ...prev, 
                                subtotal: newSubtotal,
                                total: newTotal
                              } : null);
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total (₹)</Label>
                          <Input
                            value={item.total}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Subtotal</Label>
                      <p className="text-lg font-medium">₹{roundPrice(editingOrder.subtotal || 0)}</p>
                    </div>
                    <div>
                      <Label>Shipping</Label>
                      <p className="text-lg font-medium">₹{roundPrice(editingOrder.shipping_charges || 0)}</p>
                    </div>
                    <div>
                      <Label>Discount</Label>
                      <p className="text-lg font-medium">₹{roundPrice(editingOrder.discount_amount || 0)}</p>
                    </div>
                    <div>
                      <Label>Total</Label>
                      <p className="text-xl font-bold text-primary">₹{roundPrice(editingOrder.total)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditOrderOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateOrder}>
                    Update Order
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}