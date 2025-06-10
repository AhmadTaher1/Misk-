import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trending-products',
  standalone: false,
  templateUrl: './trending-products.component.html',
  styleUrl: './trending-products.component.css'
})
export class TrendingProductsComponent implements OnInit {
  trendingProducts: Product[] = [];
  toastSuccess: boolean = false;
  toastMessage: string = '';
  showLoginToast: boolean = false;
  isAddingToCart: { [productId: number]: boolean } = {};
  @ViewChild('toastElement') toastElement!: ElementRef;
  @ViewChild('loginToastElement') loginToastElement!: ElementRef;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.productService.getTrendingProducts().subscribe({
      next: (products: Product[]) => {
        this.trendingProducts = products;
        console.log('Loaded trending products:', products);
      },
      error: (err) => {
        console.error('Error loading trending products:', err);
        this.trendingProducts = [];
        this.showToast(false, 'Failed to load trending products.');
      }
    });
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

    if (this.isAddingToCart[perfume.id]) {
      return;
    }

    if (!this.cartService.canAddToCart(perfume.id, 1)) {
      this.showToast(false, `${perfume.name} is already at maximum quantity in your cart!`);
      return;
    }

    this.isAddingToCart[perfume.id] = true;

    this.cartService.addItem(perfume.id, 1).subscribe({
      next: (success) => {
        this.isAddingToCart[perfume.id] = false;
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
        this.isAddingToCart[perfume.id] = false;
        console.error('Error adding to cart:', error);
        this.showToast(false, error.error?.message || 'Failed to add item to cart. Please try again.');
      }
    });
  }

  isProductBeingAdded(productId: number): boolean {
    return this.isAddingToCart[productId] || false;
  }

  getCartQuantity(productId: number): number {
    return this.cartService.getItemQuantity(productId);
  }

  showToast(success: boolean, message: string): void {
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
}