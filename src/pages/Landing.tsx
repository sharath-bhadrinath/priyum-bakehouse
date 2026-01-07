import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Phone, Mail, Instagram, Heart, X, Menu, Star, ShoppingBag, Clock, MapPin, Tag, ShoppingCart, Trash2, ChevronDown } from "lucide-react";
import ProductQuickView from "@/components/ProductQuickView";
import MobileSearchFilter from "@/components/MobileSearchFilter";
// import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useIsMobile } from "@/hooks/use-mobile";
// Removed custom calendar popover; using native date input

type Product = {
  id: string;
  name: string;
  mrp: number;
  selling_price: number;
  description: string | null;
  image: string | null;
  category: string | null;
  base_weight: number | null;
  weight_unit: string | null;
  weight_options: any;
  info: string | null;
  stock: number | null;
  created_at: string;
  updated_at: string;
};

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceSettings {
  phone: string;
  email: string;
  business_name: string;
}

interface FilterOptions {
  priceRange: string;
  sortBy: string;
  availability: string;
}
interface CartItem {
  id: string; // productId-variantKey
  name: string;
  price: number;
  quantity: number;
  image: string | null;
  selectedWeight?: number | null;
  selectedUnit?: string | null;
}

const Landing = () => {
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [contactInfo, setContactInfo] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productTagsMap, setProductTagsMap] = useState<Record<string, Tag[]>>({});
  const [selectedProductTags, setSelectedProductTags] = useState<Tag[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedBaseCategory, setSelectedBaseCategory] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [baseCategories, setBaseCategories] = useState<{ id: string; name: string; display_name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; display_name: string; base_category_id?: string | null }[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: "all",
    sortBy: "name",
    availability: "all"
  });
  const [orderIdToCheck, setOrderIdToCheck] = useState("");
  const [orderStatusResult, setOrderStatusResult] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [openBaseCategoryDropdown, setOpenBaseCategoryDropdown] = useState<string | null>(null);
  const { toast } = useToast();
  const switchingCategoryRef = useRef(false);
  const [previousCategory, setPreviousCategory] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigationMenuRefs = useRef<Record<string, HTMLElement>>({});

  // GSAP-based loader animation (complex but easy to implement)
  const loaderRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!loaderRef.current) return;
    const tl = gsap.timeline({ repeat: -1, defaults: { ease: "power2.inOut" } });
    const cookies = gsap.utils.toArray<HTMLElement>(".loader-cookie");
    const chips = gsap.utils.toArray<HTMLElement>(".loader-chip");
    
    // Set initial states
    gsap.set(cookies, { rotation: 0, scale: 1, y: 0 });
    gsap.set(chips, { opacity: 0, scale: 0 });
    
    // Cookie rotation and bounce
    tl.to(cookies, { 
      rotation: 360, 
      duration: 2, 
      ease: "none",
      stagger: 0.3 
    })
    .to(cookies, { 
      y: -8, 
      duration: 0.4, 
      yoyo: true, 
      repeat: 1, 
      stagger: 0.2 
    }, "<")
    .to(cookies, { 
      scale: 1.1, 
      duration: 0.3, 
      yoyo: true, 
      repeat: 1, 
      stagger: 0.1 
    }, "<")
    
    // Chocolate chips appearing and disappearing
    .to(chips, { 
      opacity: 1, 
      scale: 1, 
      duration: 0.5, 
      stagger: 0.2 
    }, 0.5)
    .to(chips, { 
      opacity: 0, 
      scale: 0, 
      duration: 0.3, 
      stagger: 0.1 
    }, ">-0.5");
    
    return () => { tl.kill(); };
  }, []);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  // using native date input for selection

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pb_cart');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved cart:', e);
    }
  }, []);

  // Persist cart to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('pb_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }, [cartItems]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, selectedCategory, selectedBaseCategory, searchQuery, filters, categories, baseCategories]);

  // Handle base category change
  const handleBaseCategoryChange = (baseCategoryId: string) => {
    if (baseCategoryId === selectedBaseCategory) return;
    
    const previousCategory = selectedCategory;
    setSelectedBaseCategory(baseCategoryId);
    
    // Auto-select first category of the base category and show its products
    const baseCategoryCats = categories.filter(cat => cat.base_category_id === baseCategoryId);
    if (baseCategoryCats.length > 0) {
      const firstCategory = baseCategoryCats[0];
      
      // Set the category immediately to show products
      setPreviousCategory(previousCategory);
      setSelectedCategory(firstCategory.id);
      
      // Trigger transition animation
      setIsTransitioning(true);
      switchingCategoryRef.current = true;
      
      setTimeout(() => {
        setIsTransitioning(false);
        switchingCategoryRef.current = false;
      }, 200);
    } else {
      setSelectedCategory(null);
    }
  };

  // Handle mobile click behavior: first click shows dropdown, second click shows products
  const handleMobileBaseCategoryClick = (baseCategoryId: string, e: React.MouseEvent) => {
    if (!isMobile) {
      // Desktop: single click selects category
      e.preventDefault();
      e.stopPropagation();
      handleBaseCategoryChange(baseCategoryId);
      return;
    }

    // Check if dropdown is already open by checking data-state attribute
    const triggerElement = e.currentTarget as HTMLElement;
    const isDropdownOpen = triggerElement.getAttribute('data-state') === 'open' || 
                          openBaseCategoryDropdown === baseCategoryId;

    if (isDropdownOpen) {
      // Second click: dropdown is open, close it and show products
      e.preventDefault();
      e.stopPropagation();
      
      // Close dropdown
      setOpenBaseCategoryDropdown(null);
      
      // Force select base category and show first category's products
      const previousCategory = selectedCategory;
      setSelectedBaseCategory(baseCategoryId);
      
      // Auto-select first category of the base category and show its products
      const baseCategoryCats = categories.filter(cat => cat.base_category_id === baseCategoryId);
      if (baseCategoryCats.length > 0) {
        const firstCategory = baseCategoryCats[0];
        
        // Set the category immediately to show products
        setPreviousCategory(previousCategory);
        setSelectedCategory(firstCategory.id);
        
        // Trigger transition animation
        setIsTransitioning(true);
        switchingCategoryRef.current = true;
        
        setTimeout(() => {
          setIsTransitioning(false);
          switchingCategoryRef.current = false;
        }, 200);
      } else {
        setSelectedCategory(null);
      }
    } else {
      // First click: let dropdown open and track which one is open
      setOpenBaseCategoryDropdown(baseCategoryId);
      // Use setTimeout to check after NavigationMenu updates the state
      setTimeout(() => {
        const currentState = triggerElement.getAttribute('data-state');
        if (currentState !== 'open') {
          // Dropdown didn't open, reset tracking
          setOpenBaseCategoryDropdown(null);
        }
      }, 100);
      // Don't prevent default - let NavigationMenu handle opening the dropdown
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    if (categoryId === selectedCategory || isTransitioning) return;
    
    setIsTransitioning(true);
    switchingCategoryRef.current = true;
    
    // Start the transition
    setTimeout(() => {
      setPreviousCategory(selectedCategory);
      setSelectedCategory(categoryId);
      
      // End the transition after content has updated
      setTimeout(() => {
        setIsTransitioning(false);
        switchingCategoryRef.current = false;
      }, 150);
    }, 50);
  };

  const renderCategoryContent = (categoryId: string | null) => {
    if (!categoryId) {
      return (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-8 sm:p-12 max-w-lg mx-auto shadow-lg backdrop-blur-sm border border-amber-200/50">
            <div className="text-6xl sm:text-8xl mb-6 animate-bounce">🔜</div>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4">Select a Category</h3>
            <p className="text-base sm:text-lg text-amber-700">Please select a category to view products</p>
          </div>
        </div>
      );
    }
    const categoryProducts = filteredProducts.filter(p => {
      const productCategoryId = (p as any).category_id;
      return productCategoryId === categoryId;
    });
    
    // Don't show "Coming Soon" if we're currently filtering, switching category, or still loading
    if (categoryProducts.length === 0 && !isFiltering && !loading && !switchingCategoryRef.current) {
      return (
        <div className="text-center py-16">
          <div className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-8 sm:p-12 max-w-lg mx-auto shadow-lg backdrop-blur-sm border border-amber-200/50">
            <div className="text-6xl sm:text-8xl mb-6 animate-bounce">
              {searchQuery ? "🔍" : "🔜"}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-amber-800 mb-4">
              {searchQuery ? "No Results Found" : "Coming Soon"}
            </h3>
            <p className="text-base sm:text-lg text-amber-700">
              {searchQuery 
                ? `No products found matching "${searchQuery}"`
                : "Delicious products are on their way!"
              }
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
        {categoryProducts.map((product) => {
          // Parse weight_options if it's a string (similar to groupedProducts)
          const processedProduct = {
            ...product,
            weight_options: typeof product.weight_options === 'string' 
              ? JSON.parse(product.weight_options || '[]')
              : product.weight_options || []
          };
          const ProductCard = (
            <Card 
              className="group overflow-hidden hover:shadow-xl transition-all duration-300 bg-amber-50/80 backdrop-blur-sm border-amber-200/50 hover:scale-105 cursor-pointer touch-manipulation"
            >
              {processedProduct.image && (
                <div className="overflow-hidden relative">
                  <img
                    src={processedProduct.image}
                    alt={processedProduct.name}
                    className="w-full h-auto object-contain group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              )}
              <CardContent className="p-3 sm:p-4 md:p-6">
                <h3 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl mb-1.5 sm:mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {processedProduct.name}
                </h3>
                {processedProduct.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 leading-relaxed whitespace-pre-line line-clamp-3">
                    {processedProduct.description}
                  </p>
                )}

                {productTagsMap[processedProduct.id] && productTagsMap[processedProduct.id].length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {productTagsMap[processedProduct.id].map(tag => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-[10px]"
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
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <div className="flex flex-col items-start">
                        <Badge variant="secondary" className="text-xs sm:text-sm md:text-base lg:text-lg font-bold px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm mb-1">
                          {formatPrice(processedProduct.selling_price, processedProduct.base_weight || undefined, processedProduct.weight_unit || undefined)}
                        </Badge>
                        {processedProduct.mrp > processedProduct.selling_price && (
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm text-gray-500">
                              S.P.: <span className="line-through">₹{processedProduct.mrp}</span>
                            </span>
                            <span className="text-[10px] sm:text-xs text-green-600 font-medium">
                              Save ₹{processedProduct.mrp - processedProduct.selling_price}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {processedProduct.weight_options && Array.isArray(processedProduct.weight_options) && processedProduct.weight_options.length > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 bg-amber-50">
                        +{processedProduct.weight_options.length} sizes
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center text-[10px] sm:text-xs text-amber-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>Fresh Daily</span>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 flex">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); addToCart(processedProduct); }}
                      className="w-full text-xs sm:text-sm py-1.5 sm:py-2"
                    >
                      <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> 
                      <span className="hidden sm:inline">Add to Cart</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          // Use ProductQuickView for mobile, regular modal for desktop
          return (
            <div key={processedProduct.id}>
              {/* Mobile: ProductQuickView */}
              <div className="sm:hidden">
                <ProductQuickView 
                  product={processedProduct} 
                  contactInfo={contactInfo} 
                  prefetchedTags={productTagsMap[processedProduct.id]}
                  onAddToCart={addToCart}
                >
                  {ProductCard}
                </ProductQuickView>
              </div>
              
              {/* Desktop: Regular modal */}
              <div className="hidden sm:block" onClick={() => handleProductClick(processedProduct)}>
                {ProductCard}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const loadData = async () => {
    try {
      // Load base categories first
      const { data: baseCategoriesData, error: baseCategoriesError } = await supabase
        .from('base_categories' as any)
        .select('id, name, display_name')
        .order('display_name', { ascending: true });
      
      if (baseCategoriesError) {
        console.error('Error loading base categories:', baseCategoriesError);
      } else if (baseCategoriesData) {
        const baseCats = (baseCategoriesData as any[]) || [];
        setBaseCategories(baseCats);
      }

      // Load categories - only those that have products with site_display = true
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories' as any)
        .select(`
          id, 
          name, 
          display_name,
          base_category_id
        `)
        .order('display_name', { ascending: true });
      
      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
      } else if (categoriesData) {
        // Now filter categories that have products with site_display = true
        const productIdsWithSiteDisplay = new Set<string>();
        const { data: productsData } = await (supabase as any)
          .from('products')
          .select('id, category_id')
          .eq('site_display', true);
        
        if (productsData) {
          (productsData as any[]).forEach((p: any) => {
            if (p.category_id) productIdsWithSiteDisplay.add(p.category_id);
          });
        }
        
        const categoriesWithProducts = (categoriesData as any[])?.filter((category: any) => 
          productIdsWithSiteDisplay.has(category.id)
        ) || [];
        setCategories(categoriesWithProducts);
        
        // Auto-select first base category and its first category if available
        const baseCats = (baseCategoriesData as any[]) || [];
        if (baseCats.length > 0 && !selectedBaseCategory) {
          const firstBaseCategory = baseCats[0];
          setSelectedBaseCategory(firstBaseCategory.id);
          
          // Auto-select first category of the first base category
          if (categoriesWithProducts.length > 0) {
            const baseCategoryCats = categoriesWithProducts.filter((cat: any) => cat.base_category_id === firstBaseCategory.id);
            if (baseCategoryCats.length > 0 && !selectedCategory) {
              const firstCategory = baseCategoryCats[0];
              setSelectedCategory(firstCategory.id);
            }
          }
        }
      }
      
      // Load products
      const result: any = await (supabase as any)
        .from("products")
        .select("*")
        .eq('site_display', true)
        .order("category", { ascending: true });
      
      const productsData = result.data;
      const productsError = result.error;

      if (productsError) {
        console.error("Error loading products:", productsError);
      } else if (productsData) {
        // Test: Add a sample product with MRP > selling_price to verify display
        const testProduct = {
          id: 'test-1',
          name: 'Test Product with MRP',
          mrp: 500,
          selling_price: 350,
          description: 'Test product to verify MRP display',
          image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400',
          category: 'test',
          base_weight: 500,
          weight_unit: 'g',
          weight_options: null,
          info: null,
          stock: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setProducts([testProduct, ...productsData as Product[]]);
        // After products load, fetch tags for these products
        try {
          const productIds = productsData.map(p => p.id);
          if (productIds.length > 0) {
            // Fetch all product_tag rows for these products
            const { data: ptRows, error: ptErr } = await supabase
              .from('product_tags')
              .select('product_id, tag_id')
              .in('product_id', productIds);

            if (ptErr) throw ptErr;

            const uniqueTagIds = Array.from(new Set((ptRows || []).map(r => r.tag_id)));
            let tagsById: Record<string, Tag> = {};
            if (uniqueTagIds.length > 0) {
              const { data: tagsRows, error: tagsErr } = await supabase
                .from('tags')
                .select('*')
                .in('id', uniqueTagIds);
              if (tagsErr) throw tagsErr;
              (tagsRows || []).forEach(t => { tagsById[t.id] = t as unknown as Tag; });
            }

            const map: Record<string, Tag[]> = {};
            (ptRows || []).forEach(r => {
              if (!map[r.product_id]) map[r.product_id] = [];
              const tag = tagsById[r.tag_id];
              if (tag) map[r.product_id].push(tag);
            });
            setProductTagsMap(map);
          } else {
            setProductTagsMap({});
          }
        } catch (e) {
          console.error('Error fetching product tags map:', e);
          setProductTagsMap({});
        }
        console.log("Products loaded:", productsData.length);
      }

      // Set hardcoded contact information
      setContactInfo({
        phone: "+91 9677349169",
        email: "priyum.orders@gmail.com",
        business_name: "PRIYUM CAKES & BAKES"
      });
      console.log("Contact info set to hardcoded values");
    } catch (error) {
      console.error("Error loading data:", error);
      // Set hardcoded contact information even on error
      setContactInfo({
        phone: "+91 9677349169",
        email: "priyum.orders@gmail.com",
        business_name: "PRIYUM CAKES & BAKES"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    setIsFiltering(true);
    
    let filtered = products.filter(product => {
      // Filter by category ID if available, otherwise by category name
      const productCategoryId = (product as any).category_id;
      if (selectedCategory) {
        if (productCategoryId !== selectedCategory) return false;
      } else {
        // If no category selected, show all products (when base category is selected but no category yet)
        return true;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesDescription = product.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Filter by price range
      if (filters.priceRange !== "all") {
        const price = product.selling_price;
        switch (filters.priceRange) {
          case "0-100":
            if (price > 100) return false;
            break;
          case "100-200":
            if (price < 100 || price > 200) return false;
            break;
          case "200-500":
            if (price < 200 || price > 500) return false;
            break;
          case "500+":
            if (price < 500) return false;
            break;
        }
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "name-desc":
          return (b.name || "").localeCompare(a.name || "");
        case "price":
          return (a.selling_price || 0) - (b.selling_price || 0);
        case "price-desc":
          return (b.selling_price || 0) - (a.selling_price || 0);
        case "popular":
          // For now, sort by name as popularity isn't tracked
          return (a.name || "").localeCompare(b.name || "");
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
    setIsFiltering(false);
    switchingCategoryRef.current = false;
  };

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    // Find the category display name from the categories array
    const categoryObj = categories.find(cat => 
      cat.name === product.category || 
      cat.id === (product as any).category_id
    );
    
    const normalizedCategory = categoryObj ? categoryObj.display_name : "Others";
    
    // Parse weight_options if it's a string
    const processedProduct = {
      ...product,
      weight_options: typeof product.weight_options === 'string' 
        ? JSON.parse(product.weight_options || '[]')
        : product.weight_options || []
    };
    
    if (!acc[normalizedCategory]) {
      acc[normalizedCategory] = [];
    }
    acc[normalizedCategory].push(processedProduct);
    return acc;
  }, {} as Record<string, Product[]>);

  
  const fetchProductTags = async (productId: string) => {
    try {
      // Fetch product tags for this specific product
      const { data: productTagData, error: productTagError } = await supabase
        .from('product_tags')
        .select('tag_id')
        .eq('product_id', productId);

      if (productTagError) throw productTagError;

      if (productTagData && productTagData.length > 0) {
        // Get the tag IDs
        const tagIds = productTagData.map(pt => pt.tag_id);
        
        // Fetch the actual tag details
        const { data: tagsData, error: tagsError } = await supabase
          .from('tags')
          .select('*')
          .in('id', tagIds)
          .order('name');

        if (tagsError) throw tagsError;
        
        setSelectedProductTags(tagsData || []);
      } else {
        setSelectedProductTags([]);
      }
    } catch (error) {
      console.error('Error fetching product tags:', error);
      setSelectedProductTags([]);
    }
  };
  
  const addToCart = (product: Product) => {
    // Parse weight_options if it's a string (similar to groupedProducts)
    const processedProduct = {
      ...product,
      weight_options: typeof product.weight_options === 'string' 
        ? JSON.parse(product.weight_options || '[]')
        : product.weight_options || []
    };
    // Open size selection dialog
    setPendingProduct(processedProduct);
    setIsSizeDialogOpen(true);
  };

  const confirmAddToCart = (product: Product, weight: number | null, unit: string | null, price: number) => {
    const variantKey = weight && unit ? `${weight}${unit}` : 'base';
    const id = `${product.id}-${variantKey}`;
    const categoryLower = (product.category || '').toLowerCase();
    const isBrownie = categoryLower.includes('brownie');
    const isEggless = categoryLower.includes('eggless');
    const brownieTag = isBrownie ? (isEggless ? ' (Eggless)' : ' (Regular)') : '';
    const baseName = product.name ? `${product.name}${brownieTag}` : 'Product';
    const displayName = weight && unit ? `${baseName} (${weight}${unit})` : baseName;
    setCartItems(prev => {
      const existing = prev.find(ci => ci.id === id);
      if (existing) {
        return prev.map(ci => ci.id === id ? { ...ci, quantity: ci.quantity + 1 } : ci);
      }
      return [...prev, {
        id,
        name: displayName,
        price: price || 0,
        quantity: 1,
        image: product.image || null,
        selectedWeight: weight,
        selectedUnit: unit,
      }];
    });
    toast({ title: "Added to cart", description: `${displayName} added to cart.` });
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    setCartItems(prev => prev
      .map(ci => ci.id === id ? { ...ci, quantity: Math.max(1, quantity) } : ci)
      .filter(ci => ci.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(ci => ci.id !== id));
  };

  const clearCart = () => setCartItems([]);

  const cartSubtotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);

  const openCheckoutForm = () => {
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", description: "Please add items to cart before checkout.", variant: "destructive" });
      return;
    }
    // Swap the cart popup with the customer details popup
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const placeOrderViaWhatsApp = () => {
    if (!customerName || !customerPhone || !customerAddress) {
      toast({ title: "Missing details", description: "Please enter name, phone and address.", variant: "destructive" });
      return;
    }
    const adminNumber = (contactInfo?.phone || "+91 9677349169").replace(/[^\d]/g, "");
    const lines: string[] = [];
    lines.push(`New Order Request`);
    lines.push("");
    lines.push(`Customer Details:`);
    lines.push(`- Name: ${customerName}`);
    lines.push(`- Phone: ${customerPhone}`);
    lines.push(`- Address: ${customerAddress}`);
    if (deliveryDate) lines.push(`- Expected Delivery: ${deliveryDate}`);
    lines.push("");
    lines.push(`Order Items:`);
    cartItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.name} x ${item.quantity} = ₹${item.price * item.quantity}`);
    });
    lines.push("");
    lines.push(`Subtotal: ₹${cartSubtotal}`);
    lines.push(`(Subtotal does not include shipping charges or discounts)`);
    lines.push("");
    lines.push(`Please confirm availability and provide final invoice total.`);
    const text = encodeURIComponent(lines.join("\n"));
    const url = `https://wa.me/${adminNumber}?text=${text}`;
    window.open(url, "_blank");
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  const handleProductClick = async (product: Product) => {
    // Parse weight_options if it's a string (similar to groupedProducts)
    const processedProduct = {
      ...product,
      weight_options: typeof product.weight_options === 'string' 
        ? JSON.parse(product.weight_options || '[]')
        : product.weight_options || []
    };
    setSelectedProduct(processedProduct);
    // Prefer prefetched map for instant render; fallback to fetch if missing
    const tags = productTagsMap[product.id];
    if (tags && tags.length > 0) {
      setSelectedProductTags(tags);
    } else {
      await fetchProductTags(product.id);
    }
    setIsProductModalOpen(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const formatPrice = (price: number, weight?: number, unit?: string) => {
    if (weight && unit) {
      return `₹${price} (${weight}${unit})`;
    }
    return `₹${price}`;
  };

  const getCookieCountInfo = (product: Product) => {
    if (product.category?.toLowerCase() === 'cookies') {
      return '10-11 cookies approx';
    }
    return null;
  };

  const formatStatus = (status: string) => {
    return status.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} ${year}`;
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

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return "Order Pending";
      case "preparing":
        return "Preparing Your Order";
      case "ready":
        return "Ready for Pickup/Delivery";
      case "shipped":
        return "Order Shipped";
      case "delivered":
        return "Order Delivered";
      case "cancelled":
        return "Order Cancelled";
      default:
        return "Unknown Status";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "pending":
        return "Your order has been received and is waiting to be processed.";
      case "preparing":
        return "Our team is preparing your delicious treats with care.";
      case "ready":
        return "Your order is ready! You can pick it up or we'll deliver it soon.";
      case "shipped":
        return "Your order has been shipped and is on its way to you.";
      case "delivered":
        return "Your order has been successfully delivered. Enjoy your treats!";
      case "cancelled":
        return "This order has been cancelled. Please contact us if you have any questions.";
      default:
        return "We're processing your order status.";
    }
  };

  const checkOrderStatus = async (orderId: string) => {
    if (!orderId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Order ID",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingStatus(true);
    try {
      // Fetch the order details including status and shipment number
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_name, status, shipment_number, created_at, total')
        .eq('id', orderId)
        .single();

      if (orderError || !orderData) {
        toast({
          title: "Order Not Found",
          description: "No order found with this Order ID",
          variant: "destructive",
        });
        return;
      }

      // Set order status result
      setOrderStatusResult({
        orderId: orderData.id,
        customerName: orderData.customer_name,
        status: orderData.status,
        shipmentNumber: orderData.shipment_number,
        total: orderData.total,
        createdAt: orderData.created_at,
        timestamp: new Date().toISOString()
      });

      setShowStatusModal(true);
      setIsMobileMenuOpen(false);

      // Removed the toast notification for "Order Status Found"

    } catch (error) {
      console.error('Order status check error:', error);
      toast({
        title: "Error",
        description: "Unable to fetch order details. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div ref={loaderRef} className="mx-auto w-48 h-44 relative flex items-center justify-center">
            <div className="relative w-48 h-32">
              {/* Cookie 1 */}
              <div className="loader-cookie absolute top-4 left-8 w-12 h-12 bg-amber-200 rounded-full shadow-md">
                <div className="absolute top-2 left-2 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-6 right-3 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-3 left-4 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-amber-800 rounded-full" />
              </div>
              {/* Cookie 2 */}
              <div className="loader-cookie absolute top-8 right-8 w-10 h-10 bg-amber-300 rounded-full shadow-md">
                <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute top-4 right-2 w-1 h-1 bg-amber-800 rounded-full" />
                <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-amber-800 rounded-full" />
              </div>
              {/* Cookie 3 */}
              <div className="loader-cookie absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 bg-amber-100 rounded-full shadow-md">
                <div className="absolute top-3 left-3 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-6 right-4 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-4 left-5 w-1.5 h-1.5 bg-amber-800 rounded-full" />
                <div className="absolute bottom-3 right-3 w-2 h-2 bg-amber-800 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-amber-800 rounded-full" />
              </div>
              {/* Floating chocolate chips */}
              <div className="loader-chip absolute top-2 left-4 w-1 h-1 bg-amber-800 rounded-full" />
              <div className="loader-chip absolute top-6 right-6 w-1 h-1 bg-amber-800 rounded-full" />
              <div className="loader-chip absolute bottom-2 left-6 w-1 h-1 bg-amber-800 rounded-full" />
            </div>
          </div>
          <p className="text-amber-800 text-lg font-semibold">Whipping up something sweet...</p>
          <p className="text-muted-foreground text-sm">Hang tight while we preheat the oven</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900 dark:via-yellow-900 dark:to-orange-900">
      {/* Responsive Navigation Header */}
      <header className="bg-[#FEED95] backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 md:py-4 lg:py-5">
          <div className="relative flex items-center justify-between min-h-[64px] md:min-h-[80px]">
            {/* Left side - Menu Button (Mobile only) */}
            <div className="flex-shrink-0 md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6 text-amber-800" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] bg-amber-50/95 border-amber-200">
                  <SheetHeader>
                    <SheetTitle className="text-amber-800">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 space-y-6">
                    {/* Category Navigation */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Categories</h3>
                      <div className="space-y-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => {
                              handleCategoryChange(category.display_name);
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              selectedCategory === category.display_name
                                ? 'bg-amber-200 text-amber-800'
                                : 'text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {category.display_name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Contact Us</h3>
                      <div className="space-y-3">
                        <a
                          href="tel:+91 9677349169"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>+91 9677349169</span>
                        </a>
                        <a
                          href="mailto:priyum.orders@gmail.com"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span>priyum.orders@gmail.com</span>
                        </a>
                        <a
                          href="https://www.instagram.com/priyum.in?igsh=MW5oZHdvOTM3bnRwcw=="
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-3 text-amber-700 hover:text-amber-600 transition-colors"
                        >
                          <Instagram className="h-4 w-4" />
                          <span>@priyum.in</span>
                        </a>
                      </div>
                    </div>

                    {/* Check Order Status */}
                    <div>
                      <h3 className="text-sm font-semibold text-amber-700 mb-3">Check Order Status</h3>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Input
                            placeholder="Enter Order ID"
                            value={orderIdToCheck}
                            onChange={(e) => setOrderIdToCheck(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            onClick={() => checkOrderStatus(orderIdToCheck)}
                            disabled={isCheckingStatus || !orderIdToCheck.trim()}
                            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                            size="sm"
                          >
                            {isCheckingStatus ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Checking...
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                Check Status
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            {/* Centered Logo - Responsive sizing for mobile and desktop */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[180px] sm:max-w-[220px] md:max-w-[260px] lg:max-w-[300px] xl:max-w-[340px] px-4 flex items-center justify-center">
              <img 
                src="/lovable-uploads/621d91fb-0a7a-4b83-b539-e0ecd76fb97d.png" 
                alt="Priyum Bakehouse Logo" 
                className="w-full h-auto object-contain max-h-[56px] sm:max-h-[64px] md:max-h-[72px] lg:max-h-[80px]"
              />
            </div>

            {/* Right side - Spacer for balance (Mobile) / Desktop navigation can go here */}
            <div className="flex-shrink-0 w-10 md:w-auto"></div>
          </div>
        </div>
      </header>

      {/* Scrolling Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white overflow-hidden">
        <div className="scrolling-banner-wrapper">
          <div className="scrolling-banner-track">
            <div className="scrolling-banner-item">
              🎉 Our new range of desserts are here! Check them out now.
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🚚 Shipping available all across India
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              💵 Shipping charges as applicable
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🎉 Our new range of desserts are here! Check them out now.
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              🚚 Shipping available all across India
            </div>
            <div className="scrolling-banner-separator">|</div>
            <div className="scrolling-banner-item">
              💵 Shipping charges as applicable
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8 pt-8">
        {/* Floating Cart Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button onClick={() => setIsCartOpen(true)} className="shadow-lg">
            <ShoppingCart className="w-4 h-4 mr-2" /> Cart ({cartItems.reduce((s, i) => s + i.quantity, 0)})
          </Button>
        </div>

        {/* Cart Sheet */}
        <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DialogContent className="w-[92vw] max-w-2xl h-[80vh] max-h-[600px] p-0 flex flex-col">
            <DialogHeader className="p-4 sm:p-6 pb-0 flex-shrink-0">
              <DialogTitle>Your Cart</DialogTitle>
            </DialogHeader>
            
            {/* Scrollable cart items area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div className="space-y-3">
                {cartItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Your cart is empty</div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      {/* Mobile layout */}
                      <div className="flex flex-col gap-3 sm:hidden">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-amber-100 rounded" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{item.name}</div>
                            <div className="text-sm text-muted-foreground">₹{item.price} each</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</Button>
                            <div className="w-6 text-center text-sm">{item.quantity}</div>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</Button>
                          </div>
                          <div className="font-medium">₹{item.price * item.quantity}</div>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Desktop layout */}
                      <div className="hidden sm:grid sm:grid-cols-[48px,1fr,auto,auto,auto] sm:items-center sm:gap-4">
                        <div className="flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-amber-100 rounded" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-sm text-muted-foreground">₹{item.price} each</div>
                        </div>
                        <div className="flex items-center gap-2 justify-center">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity - 1)}>-</Button>
                          <div className="w-6 text-center text-sm">{item.quantity}</div>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateCartQuantity(item.id, item.quantity + 1)}>+</Button>
                        </div>
                        <div className="font-medium text-right">₹{item.price * item.quantity}</div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => removeFromCart(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Fixed footer with subtotal and buttons */}
            <div className="flex-shrink-0 border-t bg-background p-4 sm:p-6">
              {/* Subtotal note */}
              {cartItems.length > 0 && (
                <p className="mb-3 text-xs text-muted-foreground">
                  *The subtotal does not including shipping charges and discounts. The final total will be on your invoice after checkout!
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-lg font-bold">Subtotal: ₹{cartSubtotal}</div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" className="flex-1 sm:flex-none" onClick={clearCart}>Clear</Button>
                  <Button className="flex-1 sm:flex-none" onClick={openCheckoutForm}>Checkout</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Checkout Form Modal (custom overlay, no dark blackout) */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/80" onClick={() => setIsCheckoutOpen(false)} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Enter your details</h3>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsCheckoutOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="custName">Name</Label>
                  <Input id="custName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <Label htmlFor="custPhone">Phone</Label>
                  <Input id="custPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Your phone number" />
                </div>
                <div>
                  <Label htmlFor="custAddress">Address</Label>
                  <Textarea id="custAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Complete delivery address" rows={3} />
                </div>
                <div>
                  <Label htmlFor="custDate">Expected Delivery Date</Label>
                  <Input
                    id="custDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    *We typically deliver orders within 3-4 days from the date of ordering. Delivery times may vary depending on your location.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                <Button onClick={placeOrderViaWhatsApp}>Place Order</Button>
              </div>
            </div>
          </div>
        )}
        {/* Responsive Category Navigation - Optimized for Mobile & Desktop */}
        {baseCategories.length > 0 && (
          <div className="mb-6 md:mb-8 w-full">
            <div className="relative">
              <NavigationMenu className="w-full">
                {/* Mobile: Horizontal Scroll | Desktop: Flexible Layout */}
                <div className="overflow-x-auto md:overflow-x-visible scrollbar-hide scroll-smooth pb-2 md:pb-0">
                  <NavigationMenuList className="flex items-center gap-2 md:gap-3 min-w-max md:min-w-0 md:flex-wrap md:justify-start">
                    {baseCategories.map((baseCategory) => {
                      const childCategories = categories.filter(cat => cat.base_category_id === baseCategory.id);
                      const isActive = selectedBaseCategory === baseCategory.id;
                      
                      return (
                        <NavigationMenuItem key={baseCategory.id} className="flex-shrink-0 list-none md:flex-shrink">
                          {childCategories.length > 0 ? (
                            <>
                              <NavigationMenuTrigger
                                ref={(el) => {
                                  if (el) {
                                    navigationMenuRefs.current[baseCategory.id] = el;
                                  }
                                }}
                                onClick={(e) => handleMobileBaseCategoryClick(baseCategory.id, e)}
                                className={`
                                  relative rounded-full font-semibold
                                  whitespace-nowrap transition-all duration-300 ease-out
                                  transform active:scale-95 md:active:scale-100
                                  border-0 shadow-none bg-transparent hover:bg-transparent
                                  p-0 h-auto
                                  /* Mobile Styles */
                                  px-4 py-2.5 text-xs
                                  /* Desktop Styles */
                                  md:px-6 md:py-3 md:text-sm
                                  ${
                                    isActive
                                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105 md:scale-100 md:hover:scale-105'
                                      : 'bg-white/80 backdrop-blur-sm text-amber-900 border border-amber-200/50 hover:bg-amber-50 hover:border-amber-300 hover:shadow-md md:hover:shadow-lg'
                                  }
                                  focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2
                                  [&>svg]:hidden
                                `}
                              >
                                <span className="relative z-10">{baseCategory.display_name}</span>
                                {isActive && (
                                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-75 blur-sm -z-0"></span>
                                )}
                              </NavigationMenuTrigger>
                              <NavigationMenuContent className="md:mt-2">
                                <div className="p-3 md:p-4 min-w-[240px] md:min-w-[280px] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-amber-100/50">
                                  <div className="space-y-1 md:space-y-2">
                                    {childCategories.map((category) => (
                                      <button
                                        key={category.id}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          
                                          setOpenBaseCategoryDropdown(null);
                                          
                                          setTimeout(() => {
                                            const triggerRef = navigationMenuRefs.current[baseCategory.id];
                                            if (triggerRef) {
                                              const escapeEvent = new KeyboardEvent('keydown', {
                                                key: 'Escape',
                                                code: 'Escape',
                                                keyCode: 27,
                                                which: 27,
                                                bubbles: true,
                                                cancelable: true
                                              });
                                              triggerRef.dispatchEvent(escapeEvent);
                                              triggerRef.blur();
                                            }
                                          }, 0);
                                          
                                          handleBaseCategoryChange(baseCategory.id);
                                          handleCategoryChange(category.id);
                                        }}
                                        className={`
                                          w-full text-left rounded-xl font-medium
                                          transition-all duration-200
                                          /* Mobile Styles */
                                          px-3 py-2.5 text-xs
                                          /* Desktop Styles */
                                          md:px-4 md:py-3 md:text-sm
                                          ${
                                            selectedCategory === category.id
                                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md transform scale-[1.02] md:hover:scale-[1.03]'
                                              : 'text-amber-900 hover:bg-amber-50 hover:text-amber-700 active:scale-95 md:active:scale-100 md:hover:scale-[1.01]'
                                          }
                                          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1
                                        `}
                                      >
                                        {category.display_name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </NavigationMenuContent>
                            </>
                          ) : (
                            <button
                              onClick={() => handleBaseCategoryChange(baseCategory.id)}
                              className={`
                                relative rounded-full font-semibold
                                whitespace-nowrap transition-all duration-300 ease-out
                                transform active:scale-95 md:active:scale-100
                                /* Mobile Styles */
                                px-4 py-2.5 text-xs
                                /* Desktop Styles */
                                md:px-6 md:py-3 md:text-sm
                                ${
                                  isActive
                                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105 md:scale-100 md:hover:scale-105'
                                    : 'bg-white/80 backdrop-blur-sm text-amber-900 border border-amber-200/50 hover:bg-amber-50 hover:border-amber-300 hover:shadow-md md:hover:shadow-lg'
                                }
                                focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2
                              `}
                            >
                              <span className="relative z-10">{baseCategory.display_name}</span>
                              {isActive && (
                                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 opacity-75 blur-sm -z-0"></span>
                              )}
                            </button>
                          )}
                        </NavigationMenuItem>
                      );
                    })}
                  </NavigationMenuList>
                </div>
              </NavigationMenu>
              
              {/* Desktop: Subtle gradient fade indicators (hidden on mobile) */}
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-amber-50 via-amber-50/50 to-transparent pointer-events-none opacity-0 transition-opacity duration-300"></div>
              <div className="hidden md:block absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-amber-50 via-amber-50/50 to-transparent pointer-events-none opacity-0 transition-opacity duration-300"></div>
            </div>
          </div>
        )}
        
        {/* Product Grid with Crossfade */}
        <div className="relative min-h-[400px]">
          {/* Previous content (fading out) */}
          {isTransitioning && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-200 ease-in-out">
              {renderCategoryContent(previousCategory)}
            </div>
          )}
          
          {/* Current content (fading in) */}
          <div className={`transition-opacity duration-200 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {renderCategoryContent(selectedCategory)}
          </div>
        </div>

        {/* Product Detail Modal - Desktop Only */}
        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-amber-50/95 backdrop-blur-sm border-amber-200 p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-amber-800">
                {selectedProduct?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="p-6 pt-4">
                {/* Mobile Image Carousel */}
                <div className="sm:hidden mb-6">
                  <Carousel className="w-full">
                    <CarouselContent>
                      <CarouselItem>
                        {selectedProduct.image ? (
                          <div className="overflow-hidden rounded-xl border-2 border-amber-200">
                            <img
                              src={selectedProduct.image}
                              alt={selectedProduct.name}
                              className="w-full h-auto object-contain"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square bg-amber-100 rounded-xl border-2 border-amber-200 flex items-center justify-center">
                            <p className="text-amber-600">No image available</p>
                          </div>
                        )}
                      </CarouselItem>
                    </CarouselContent>
                  </Carousel>
                </div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                  {/* Desktop Product Image */}
                  <div className="hidden sm:block space-y-4">
                  {selectedProduct.image ? (
                      <div className="overflow-hidden rounded-xl border-2 border-amber-200">
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                          className="w-full h-auto object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-amber-100 rounded-xl border-2 border-amber-200 flex items-center justify-center">
                      <p className="text-amber-600">No image available</p>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-6">
                  {selectedProduct.description && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Description</h3>
                      <div className="text-amber-700 leading-relaxed whitespace-pre-wrap font-normal">
                        {selectedProduct.description}
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  {selectedProduct.info && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">Additional Information</h3>
                      <div className="text-amber-700 leading-relaxed whitespace-pre-wrap font-normal">
                        {selectedProduct.info}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedProductTags.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProductTags.map((tag) => (
                          <Badge 
                            key={tag.id}
                            variant="outline"
                            className="text-sm"
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
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-3">Pricing</h3>
                    
                    {/* Base Price */}
                    <div className="bg-amber-100/70 rounded-lg p-4 mb-4 border border-amber-200">
                      <div className="flex flex-col items-start">
                        <div className="flex flex-col items-start">
                          <Badge className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-lg px-3 py-1 shadow-sm mb-1">
                            {formatPrice(selectedProduct.selling_price, selectedProduct.base_weight || undefined, selectedProduct.weight_unit || undefined)}
                          </Badge>
                          {selectedProduct.mrp > selectedProduct.selling_price && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                S.P.: <span className="line-through">₹{selectedProduct.mrp}</span>
                              </span>
                              <span className="text-xs text-green-600 font-medium">
                                Save ₹{selectedProduct.mrp - selectedProduct.selling_price}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Cookie Count Information */}
                      {getCookieCountInfo(selectedProduct) && (
                        <div className="mt-2 text-center">
                          <span className="text-sm text-amber-700 font-medium bg-amber-50 px-3 py-1 rounded-full">
                            {getCookieCountInfo(selectedProduct)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Weight Options */}
                    {selectedProduct.weight_options && 
                     Array.isArray(selectedProduct.weight_options) && 
                     selectedProduct.weight_options.length > 0 && (
                      <div>
                        <h4 className="font-medium text-amber-800 mb-3">Available Sizes</h4>
                        <div className="space-y-2">
                          {selectedProduct.weight_options.map((option: any, index: number) => (
                            <div 
                              key={index} 
                              className="bg-white/70 rounded-lg p-3 border border-amber-200 flex justify-between items-center hover:bg-amber-50/70 transition-colors"
                            >
                              <span className="text-amber-800 font-medium">
                                {option.weight}{option.unit}
                              </span>
                              <div className="flex flex-col items-end">
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                  ₹{option.selling_price}
                                </Badge>
                                {(option.mrp || option.price || 0) > (option.selling_price || option.price || 0) && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      S.P.: <span className="line-through">₹{option.mrp || option.price}</span>
                                    </span>
                                    <span className="text-xs text-green-600 font-medium">
                                      Save ₹{(option.mrp || option.price || 0) - (option.selling_price || option.price || 0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Product Features */}
                    <div className="flex items-center justify-center text-amber-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Fresh Daily</span>
                      </div>
                    </div>

                  {/* Add to Cart Only */}
                  <div>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => selectedProduct && addToCart(selectedProduct)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Order Status Modal */}
        {/* Size Selection Dialog for Add to Cart */}
        <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Select Size & Add to Cart</DialogTitle>
            </DialogHeader>
            {pendingProduct && (
              <div className="grid gap-3 py-2">
                <div className="flex items-center space-x-3 mb-2">
                  {pendingProduct.image ? (
                    <img src={pendingProduct.image} alt={pendingProduct.name} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-amber-100 rounded" />
                  )}
                  <div>
                    <div className="font-medium">{pendingProduct.name}</div>
                    {pendingProduct.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{pendingProduct.description}</div>
                    )}
                  </div>
                </div>

                <div 
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    confirmAddToCart(pendingProduct, pendingProduct.base_weight || null, pendingProduct.weight_unit || null, pendingProduct.selling_price);
                    setIsSizeDialogOpen(false);
                  }}
                >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {pendingProduct.base_weight || 0} {pendingProduct.weight_unit || ''} (Base)
                          </span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">₹{pendingProduct.selling_price}</span>
                            {pendingProduct.mrp > pendingProduct.selling_price && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  S.P.: <span className="line-through">₹{pendingProduct.mrp}</span>
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                  Save ₹{pendingProduct.mrp - pendingProduct.selling_price}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                </div>

                {Array.isArray(pendingProduct.weight_options) && pendingProduct.weight_options.length > 0 && (
                  <div className="space-y-2">
                    {pendingProduct.weight_options.map((opt: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => {
                          confirmAddToCart(pendingProduct, opt.weight, opt.unit, opt.selling_price);
                          setIsSizeDialogOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{opt.weight} {opt.unit}</span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">₹{opt.selling_price}</span>
                            {(opt.mrp || opt.price || 0) > (opt.selling_price || opt.price || 0) && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  S.P.: <span className="line-through">₹{opt.mrp || opt.price}</span>
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                  Save ₹{(opt.mrp || opt.price || 0) - (opt.selling_price || opt.price || 0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-amber-50/95 backdrop-blur-sm border-amber-200 transition-all duration-300 ease-in-out transform scale-100 opacity-100 animate-modal-entrance">
            <DialogHeader className="transition-all duration-300 ease-in-out">
              <DialogTitle className="text-xl font-bold text-amber-800 flex items-center transition-all duration-300 ease-in-out">
                <Clock className="h-5 w-5 mr-2 transition-transform duration-300 ease-in-out" />
                Order Status
              </DialogTitle>
            </DialogHeader>
            
            {orderStatusResult && (
              <div className="space-y-6 transition-all duration-500 ease-in-out animate-fade-in">
                {/* Order Details */}
                <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                  <h3 className="font-semibold text-amber-800 mb-3 transition-all duration-300 ease-in-out">Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm transition-all duration-300 ease-in-out">
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Order ID:</span>
                      <p className="text-amber-800">{orderStatusResult.orderId}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Customer:</span>
                      <p className="text-amber-800">{orderStatusResult.customerName}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Status:</span>
                      <div className="flex items-center space-x-2">
                        <p className="text-amber-800">{formatStatus(orderStatusResult.status)}</p>
                        {getStatusAnimation(orderStatusResult.status)}
                      </div>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Total:</span>
                      <p className="text-amber-800">₹{orderStatusResult.total}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Created At:</span>
                      <p className="text-amber-800">{formatDate(orderStatusResult.createdAt)}</p>
                    </div>
                    <div className="transition-all duration-300 ease-in-out hover:bg-amber-50/50 p-2 rounded">
                      <span className="text-amber-600 font-medium">Checked At:</span>
                      <p className="text-amber-800">{formatDate(orderStatusResult.timestamp)}</p>
                    </div>
                  </div>
                </div>

                {/* Conditional Content based on Status */}
                {orderStatusResult.status === "shipped" && orderStatusResult.shipmentNumber ? (
                  // Show shipment tracking for shipped orders with shipment number
                  <>
                    <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                      <h3 className="font-semibold text-amber-800 mb-3 flex items-center transition-all duration-300 ease-in-out">
                        <MapPin className="h-5 w-5 mr-2 transition-transform duration-300 ease-in-out" />
                        Shipment Tracking
                      </h3>
                      <div className="bg-gray-50 rounded p-3 border transition-all duration-300 ease-in-out">
                        <p className="text-sm text-gray-600 mb-2 transition-all duration-300 ease-in-out">
                          <strong>Note:</strong> To get detailed tracking information, 
                          please visit the <a href="https://www.dtdc.in/trace.asp" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline transition-all duration-300 ease-in-out">DTDC tracking page</a> directly.
                        </p>
                        <div className="text-sm text-gray-700 transition-all duration-300 ease-in-out">
                          <p><strong>Shipment Number:</strong> {orderStatusResult.shipmentNumber}</p>
                          <p><strong>Status:</strong> Ready for tracking on DTDC website</p>
                        </div>
                      </div>
                    </div>

                    {/* Direct DTDC Link */}
                    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                      <h4 className="font-semibold text-amber-800 mb-2 transition-all duration-300 ease-in-out">Get Detailed Tracking</h4>
                      <p className="text-sm text-amber-700 mb-3 transition-all duration-300 ease-in-out">
                        For complete tracking details, visit the official DTDC tracking page.
                      </p>
                      <Button
                        asChild
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
                      >
                        <a 
                          href={`https://www.dtdc.in/trace.asp?awb=${orderStatusResult.shipmentNumber}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4 mr-2 transition-transform duration-300 ease-in-out" />
                          View on DTDC Website
                        </a>
                      </Button>
                    </div>
                  </>
                ) : (
                  // Show status-specific information for other statuses
                  <div className="bg-white/70 rounded-lg p-4 border border-amber-200 transition-all duration-300 ease-in-out hover:shadow-md transform hover:scale-[1.02]">
                    <h3 className="font-semibold text-amber-800 mb-3 transition-all duration-300 ease-in-out">Current Status</h3>
                    <div className="bg-gray-50 rounded p-3 border transition-all duration-300 ease-in-out">
                      <div className="flex items-center space-x-3 mb-3 transition-all duration-300 ease-in-out">
                        {getStatusAnimation(orderStatusResult.status)}
                        <span className="text-lg font-medium text-amber-800 transition-all duration-300 ease-in-out">
                          {formatStatus(getStatusMessage(orderStatusResult.status))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 transition-all duration-300 ease-in-out">
                        {getStatusDescription(orderStatusResult.status)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-gray-800 dark:to-gray-900 border-t border-amber-200 mt-16 shadow-inner">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">For Bulk Orders</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
              <a
                href="https://wa.me/919677349169"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">+91 9677349169</span>
              </a>
              
              <a
                href="mailto:priyum.orders@gmail.com"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">priyum.orders@gmail.com</span>
              </a>
              
              <a
                href="https://www.instagram.com/priyum.in?igsh=MW5oZHdvOTM3bnRwcw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-amber-800 hover:text-amber-600 transition-all duration-200 p-3 rounded-lg hover:bg-amber-50/70 backdrop-blur-sm"
              >
                <Instagram className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-semibold text-base sm:text-lg">@priyum.in</span>
              </a>
            </div>
            
            <div className="pt-6 border-t border-amber-300/50">
              <p className="text-amber-700 text-sm sm:text-base">
                © 2026 {"PRIYUM CAKES & BAKES"}. Made with ❤️
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;