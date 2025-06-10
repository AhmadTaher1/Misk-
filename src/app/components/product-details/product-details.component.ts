import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
declare var $: any;

@Component({
  selector: 'app-product-details',
  standalone: false,
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent implements OnInit {
  product: Product | null = null;
  quantity = 1;
  toastSuccess: boolean = false;
  toastMessage: string = '';
  showLoginToast: boolean = false;
  isAddingToCart: boolean = false;
  @ViewChild('toastElement') toastElement!: ElementRef;
  @ViewChild('loginToastElement') loginToastElement!: ElementRef;


  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const productId = +params['id'];
      if (productId) {
        this.productService.getProductById(productId).subscribe({
          next: (product: Product) => {
            this.product = product;
            this.quantity = 1;
            console.log('Loaded product:', product);
          },
          error: (err) => {
            console.error('Error loading product:', err);
            this.product = null;
            this.showToast(false, 'Failed to load product. Please try again.');
          }
        });
      } else {
        this.showToast(false, 'No product ID provided.');
        this.product = null;
      }
    });
  }

  increase(): void {
    if (this.product && this.quantity < this.getMaxAllowedQuantity()) {
      this.quantity++;
    }
  }

  decrease(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  
  getMaxAllowedQuantity(): number {
    if (!this.product) return 1;
    
    const currentCartQuantity = this.cartService.getItemQuantity(this.product.id);
    const availableToAdd = this.product.quantity - currentCartQuantity;
    
    return Math.min(this.product.quantity, currentCartQuantity + availableToAdd);
  }

  getCurrentCartQuantity(): number {
    if (!this.product) return 0;
    return this.cartService.getItemQuantity(this.product.id);
  }

  addToCart(): void {
    if (!this.authService.isLoggedIn()) {
      this.showLoginToast = true;
      this.showToast(false, 'You must log in to add items to the cart.');
      return;
    }

    if (!this.product) {
      this.showToast(false, 'Product not loaded. Please try again.');
      return;
    }

    if (this.product.quantity === 0) {
      this.showToast(false, 'This product is out of stock!');
      return;
    }

    if (this.isAddingToCart) {
      return;
    }

    const currentCartQuantity = this.cartService.getItemQuantity(this.product.id);
    const totalQuantityAfterAdd = currentCartQuantity + this.quantity;

    if (totalQuantityAfterAdd > this.product.quantity) {
      this.showToast(false, `Cannot add ${this.quantity} items. Only ${this.product.quantity - currentCartQuantity} more available.`);
      return;
    }

    this.isAddingToCart = true;

    // add to cart (api)
    this.cartService.addItem(this.product.id, this.quantity).subscribe({
      next: (success) => {
        this.isAddingToCart = false;
        
        if (success) {
          const newTotalQuantity = this.cartService.getItemQuantity(this.product!.id);
          
          if (currentCartQuantity > 0) {
            this.showToast(true, `${this.product!.name} quantity updated in cart! Total: ${newTotalQuantity}`);
          } else {
            this.showToast(true, `${this.product!.name} added to cart! Quantity: ${this.quantity}`);
          }
          
          // reset quantity to 1 after successful add
          this.quantity = 1;
        } else {
          this.showToast(false, 'Failed to add item to cart. Please try again.');
        }
      },
      error: (error) => {
        this.isAddingToCart = false;
        console.error('Error adding to cart:', error);
        
        if (error.status === 400) {
          if (error.error && error.error.message) {
            this.showToast(false, error.error.message);
          } else {
            this.showToast(false, 'Cannot add more items. Stock limit reached.');
          }
        } else if (error.status === 401) {
          this.showToast(false, 'Please log in to add items to cart.');
        } else {
          this.showToast(false, 'Failed to add item to cart. Please try again.');
        }
      }
    });
  }

  isAddToCartDisabled(): boolean {
    if (!this.product) return true;
    if (this.product.quantity === 0) return true;
    if (this.isAddingToCart) return true;
    
    const currentCartQuantity = this.cartService.getItemQuantity(this.product.id);
    return currentCartQuantity >= this.product.quantity;
  }

  getAddToCartButtonText(): string {
    if (this.isAddingToCart) return 'Adding...';
    if (!this.product) return 'Add to Cart';
    if (this.product.quantity === 0) return 'Out of Stock';
    
    const currentCartQuantity = this.cartService.getItemQuantity(this.product.id);
    if (currentCartQuantity >= this.product.quantity) {
      return 'Max Quantity Reached';
    }
    
    return 'Add to Cart';
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