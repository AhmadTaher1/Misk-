import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, ApiResponse } from '../../models/product';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Options } from '@angular-slider/ngx-slider';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-product',
  standalone: false,
  templateUrl: './product.component.html',
  styleUrl: './product.component.css'
})
export class ProductComponent implements OnInit, AfterViewInit {
  products: Product[] = [];
  currentPage: number = 1;
  totalPages: number = 1;
  pageSize: number = 6;
  filters = {
    name: '',
    minPrice: 0,
    maxPrice: 10000,
    brands: [] as string[]
  };
  sliderOptions: Options = {
    floor: 0,
    ceil: 10000,
    step: 1,
    animate: false,
    showTicks: false,
    showTicksValues: false,
    hideLimitLabels: true,
    hidePointerLabels: true
  };
  toastSuccess: boolean = false;
  toastMessage: string = '';
  showLoginToast: boolean = false;
  selectedGender: string = 'all';
  @ViewChild('toastElement') toastElement!: ElementRef;
  @ViewChild('loginToastElement') loginToastElement!: ElementRef;

  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialize slider options first
    this.initializeSliderOptions();
    
    this.route.queryParams.subscribe(params => {
      this.filters.name = params['name'] || '';
      this.filters.minPrice = +params['minPrice'] || 0;
      this.filters.maxPrice = +params['maxPrice'] || this.sliderOptions.ceil || 10000;
      this.filters.brands = (params['brands'] || '').split(',').filter(Boolean) as string[] || [];
      this.currentPage = +params['page'] || 1;
      this.selectedGender = params['gender'] || 'all';
      console.log('Loaded filters from query params:', { ...this.filters, selectedGender: this.selectedGender });
      this.loadProducts();
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.applyFilters());
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  loadProducts(): void {
    console.log('Loading products with filters:', this.filters);
    this.productService.getFilteredProducts({
      name: this.filters.name,
      minPrice: this.filters.minPrice,
      maxPrice: this.filters.maxPrice,
      brands: this.filters.brands,
      page: this.currentPage - 1, //for back
      pageSize: this.pageSize,
      gender: this.selectedGender !== 'all' ? this.selectedGender : undefined 
    }).subscribe({
      next: (response: ApiResponse) => {
        console.log('API response:', response);
        if (response.success) {
          this.products = response.data.content.map(p => ({
            id: p.productId,
            name: p.name,
            description: p.description,
            price: p.price,
            quantity: p.quantity,
            brand: p.brand,
            size: p.size,
            gender: p.gender,
            imageUrl: p.photo
          }));
          this.totalPages = response.data.totalPages || 1;
          this.currentPage = response.data.number + 1; 
        } else {
          this.products = [];
          this.totalPages = 1;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading products:', err);
        this.products = [];
        this.totalPages = 1;
        this.showToast(false, 'Error loading products. Please try again.');
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    console.log('Applying filters with name:', this.filters.name);
    if (this.filters.minPrice > this.filters.maxPrice) {
      [this.filters.minPrice, this.filters.maxPrice] = [this.filters.maxPrice, this.filters.minPrice];
    }
    const newParams: any = {
      page: this.currentPage,
      name: this.filters.name || null,
      minPrice: this.filters.minPrice,
      maxPrice: this.filters.maxPrice,
      brands: this.filters.brands.length ? this.filters.brands.join(',') : null
    };

    //include gender if not all
    if (this.selectedGender && this.selectedGender !== 'all') {
      newParams['gender'] = this.selectedGender; 
    }
    this.router.navigate(['/products'], {
      queryParams: newParams,
      queryParamsHandling: 'merge'
    }).then(() => {
      this.loadProducts();
    });
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.filters = {
      name: '',
      minPrice: 0,
      maxPrice: this.sliderOptions.ceil || 10000,
      brands: []
    };
    this.selectedGender = 'all';
    this.applyFilters();
  }

  onSearchChange(): void {
    this.filters.name = this.filters.name || '';
    this.searchSubject.next(this.filters.name);
  }

  onGenderChange(gender: string): void {
    console.log('onGenderChange called with gender:', gender);
    this.selectedGender = gender;
    this.cdr.detectChanges();
    this.applyFilters();
  }

  addToCart(event: Event, perfume: Product): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.authService.isLoggedIn()) {
      this.showLoginToast = true;
      this.showToast(false, 'You must log in to add items to the cart.');
      return;
    }

    if (perfume.quantity === 0) {
      this.showToast(false, 'This product is out of stock!');
      return;
    }

    if (!this.cartService.canAddToCart(perfume.id, 1)) {
      this.showToast(false, `${perfume.name} is already at maximum quantity in your cart!`);
      return;
    }

    this.cartService.addItem(perfume.id, 1).subscribe({
      next: (success) => {
        if (success) {
          const newQuantity = this.cartService.getItemQuantity(perfume.id);
          if (newQuantity > 1) {
            this.showToast(true, `${perfume.name} quantity updated in cart! Total: ${newQuantity}`);
          } else {
            this.showToast(true, `${perfume.name} added to cart!`);
          }
        } else {
          this.showToast(false, 'Failed to add item to cart. Please try again.');
        }
      },
      error: (error) => {
        console.error('Error adding to cart:', error);
        this.showToast(false, error.error?.message || 'Failed to add item to cart. Please try again.');
      }
    });
  }

  showToast(success: boolean, message: string): void {
    console.log('showToast called:', { success, message });
    this.toastSuccess = success;
    this.toastMessage = message;

    setTimeout(() => {
      if (this.showLoginToast && this.loginToastElement?.nativeElement) {
        const loginToast = new (window as any).bootstrap.Toast(this.loginToastElement.nativeElement);
        loginToast.show();
        this.showLoginToast = false;
      } else if (this.toastElement?.nativeElement) {
        const toast = new (window as any).bootstrap.Toast(this.toastElement.nativeElement);
        toast.show();
      }
    }, 100);
  }

  getPageRange(): number[] {
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);
    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getPageParams(page: number): any {
    const params: any = {
      page,
      name: this.filters.name || null,
      minPrice: this.filters.minPrice,
      maxPrice: this.filters.maxPrice,
      brands: this.filters.brands.length ? this.filters.brands.join(',') : null
    };
    if (this.selectedGender && this.selectedGender !== 'all') {
      params['gender'] = this.selectedGender;
    }
    return params;
  }

  private initializeSliderOptions(): void {
    this.productService.getFilteredProducts({
      name: '',
      minPrice: 0,
      maxPrice: 10000,
      brands: [],
      page: 0,
      pageSize: 50
    }).subscribe({
      next: (response: ApiResponse) => {
        if (response.success && response.data.content.length > 0) {
          const prices = response.data.content.map(p => p.price);
          const maxPrice = Math.max(...prices);
          const ceilPrice = Math.ceil(maxPrice / 100) * 100; // round up to nearest 100
          
          this.sliderOptions = {
            floor: 0,
            ceil: ceilPrice,
            step: 1,
            animate: false,
            showTicks: false,
            showTicksValues: false,
            hideLimitLabels: true,
            hidePointerLabels: true
          };
          
          // Set initial max price 
          if (this.filters.maxPrice === 1000) {
            this.filters.maxPrice = ceilPrice;
            this.applyFilters();
          }
          
          console.log('Slider initialized - Max price:', ceilPrice);
        } else {
          this.sliderOptions = {
            floor: 0,
            ceil: 10000,
            step: 1,
            animate: false,
            showTicks: false,
            showTicksValues: false,
            hideLimitLabels: true,
            hidePointerLabels: true
          };
        }
      },
      error: (err) => {
        console.error('Error initializing slider:', err);
        this.sliderOptions = {
          floor: 0,
          ceil: 10000,
          step: 1,
          animate: false,
          showTicks: false,
          showTicksValues: false,
          hideLimitLabels: true,
          hidePointerLabels: true
        };
      }
    });
  }

}