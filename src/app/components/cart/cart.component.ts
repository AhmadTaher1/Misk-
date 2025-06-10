import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CartItem } from '../../models/cart';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  subtotal: number = 0;
  toastMessage: string = '';
  isToastVisible: boolean = false;
  toastSuccess: boolean = false;
  private cartSubscription: Subscription = new Subscription();

  @ViewChild('orderPrice') orderPrice!: ElementRef;
  @ViewChild('toastElement') toastElement!: ElementRef;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCart();
    this.cartSubscription = this.cartService.cartCount$.subscribe(() => {
      this.updateSubtotal();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription.unsubscribe();
  }

  loadCart(): void {
    this.cartItems = this.cartService.getCartItems();
    this.updateSubtotal();
    const unavailableItems = this.cartItems.filter(item => item.availableStock === 0);
    if (unavailableItems.length > 0) {
      this.showToast(false, 'Some items are out of stock and may need to be removed.');
    }
  }

  updateSubtotal(): void {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.quantity * item.productPrice), 0);
    if (this.orderPrice) {
      this.orderPrice.nativeElement.textContent = `${this.subtotal} EGP`;
    }
  }

 increaseQuantity(item: CartItem): void {
    if (item.quantity < item.availableStock) {
      const currentIndex = this.cartItems.findIndex(i => i.productId === item.productId);
      this.cartService.updateItemQuantity(item.productId, item.quantity + 1).subscribe({
        next: (success: boolean) => {
          if (success && currentIndex !== -1) {
            this.cartItems[currentIndex].quantity++;
            this.cartItems[currentIndex].totalPrice = this.cartItems[currentIndex].quantity * this.cartItems[currentIndex].productPrice;
            this.updateSubtotal();
            this.cdr.detectChanges();
          } else if (currentIndex !== -1) {
            this.showToast(false, 'Failed to update quantity. Please try again.');
          }
        },
        error: (error) => {
          if (currentIndex !== -1) {
            this.cartItems[currentIndex].quantity++; // local
            this.cartItems[currentIndex].totalPrice = this.cartItems[currentIndex].quantity * this.cartItems[currentIndex].productPrice;
            this.updateSubtotal();
            this.cdr.detectChanges();
          }
          this.showToast(false, error.error?.message || 'Insufficient stock or error updating quantity.');
        }
      });
    } else {
      this.showToast(false, `Cannot add more ${item.productName}. Only ${item.availableStock} available.`);
    }
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      const currentIndex = this.cartItems.findIndex(i => i.productId === item.productId);
      this.cartService.updateItemQuantity(item.productId, item.quantity - 1).subscribe({
        next: (success: boolean) => {
          if (success && currentIndex !== -1) {
            this.cartItems[currentIndex].quantity--;
            this.cartItems[currentIndex].totalPrice = this.cartItems[currentIndex].quantity * this.cartItems[currentIndex].productPrice;
            this.updateSubtotal();
            this.cdr.detectChanges();
          } else if (currentIndex !== -1) {
            this.showToast(false, 'Failed to update quantity. Please try again.');
          }
        },
        error: (error) => {
          if (currentIndex !== -1) {
            this.cartItems[currentIndex].quantity--; // locall update
            this.cartItems[currentIndex].totalPrice = this.cartItems[currentIndex].quantity * this.cartItems[currentIndex].productPrice;
            this.updateSubtotal();
            this.cdr.detectChanges();
          }
          this.showToast(false, error.error?.message || 'Error updating quantity.');
        }
      });
    }
  }

  removeItem(productId: number): void {
    const currentIndex = this.cartItems.findIndex(i => i.productId === productId);
    this.cartService.removeItem(productId).subscribe({
      next: (success) => {
        if (success && currentIndex !== -1) {
          this.cartItems.splice(currentIndex, 1);
          this.updateSubtotal();
          this.cdr.detectChanges(); 
        }
        this.showToast(true, 'Item removed from cart.');
      },
      error: (error) => {
        this.showToast(false, error.error?.message || 'Error removing item.');
      }
    });
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  proceedToCheckout(): void {
    if (this.cartItems.length === 0) {
      this.showToast(false, 'Your cart is empty.');
      return;
    }
    if (this.cartItems.some(item => item.availableStock < item.quantity)) {
      this.showToast(false, 'Some items exceed available stock. Please update your cart.');
      return;
    }
    this.router.navigate(['/checkout']);
  }

  showToast(success: boolean, message: string): void {
    this.toastSuccess = success;
    this.toastMessage = message;
    this.isToastVisible = true;

    setTimeout(() => {
      if (this.toastElement?.nativeElement) {
        const toast = new (window as any).bootstrap.Toast(this.toastElement.nativeElement);
        toast.show();
      }
    }, 100);
  }
}
