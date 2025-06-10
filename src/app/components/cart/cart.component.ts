import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { CartItem } from '../../models/cart';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  subtotal: number = 0;
  toastMessage: string = '';
  isToastVisible: boolean = false;
  toastSuccess: boolean = false;
  private cartSubscription: Subscription = new Subscription();
  private processingItems: Set<number> = new Set();

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

    this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = [...items];
      this.updateSubtotal();

      const unavailableItems = this.cartItems.filter(item => item.availableStock === 0);
      if (unavailableItems.length > 0) {
        this.showToast(false, 'Some items are out of stock and may need to be removed.');
      }

      this.cdr.markForCheck();
    });

    this.cartService.loadCartFromAPI();
  }

  ngOnDestroy(): void {
    this.cartSubscription.unsubscribe();
  }

  loadCart(): void {
    this.cartItems = [...this.cartService.getCartItems()];
    this.updateSubtotal();
    const unavailableItems = this.cartItems.filter(item => item.availableStock === 0);
    if (unavailableItems.length > 0) {
      this.showToast(false, 'Some items are out of stock and may need to be removed.');
    }
    this.cdr.markForCheck();
  }

  updateSubtotal(): void {
    this.subtotal = this.cartItems.reduce((sum, item) => sum + (item.quantity * item.productPrice), 0);
    if (this.orderPrice) {
      this.orderPrice.nativeElement.textContent = `${this.subtotal} EGP`;
    }
  }

  increaseQuantity(item: CartItem): void {
    if (this.processingItems.has(item.productId)) {
      return;
    }

    if (item.quantity >= item.availableStock) {
      this.showToast(false, `Cannot add more ${item.productName}. Only ${item.availableStock} available.`);
      return;
    }

    this.processingItems.add(item.productId);
    const newQuantity = item.quantity + 1;

    this.cartService.updateItemQuantity(item.productId, newQuantity).subscribe({
      next: (success: boolean) => {
        this.processingItems.delete(item.productId);
        if (!success) {
          this.showToast(false, 'Failed to update quantity. Please try again.');
        }
        this.updateSubtotal(); // Update subtotal after quantity change
        this.cdr.markForCheck(); // Trigger change detection
      },
      error: (error) => {
        this.processingItems.delete(item.productId);
        console.error('Error updating quantity:', error);
        this.showToast(false, error.error?.message || 'Insufficient stock or error updating quantity.');
        this.cdr.markForCheck();
      }
    });
  }

  decreaseQuantity(item: CartItem): void {
    if (this.processingItems.has(item.productId)) {
      return;
    }

    if (item.quantity <= 1) {
      this.showToast(false, 'Quantity cannot be less than 1. Use remove button to delete item.');
      return;
    }

    this.processingItems.add(item.productId);
    const newQuantity = item.quantity - 1;

    this.cartService.updateItemQuantity(item.productId, newQuantity).subscribe({
      next: (success: boolean) => {
        this.processingItems.delete(item.productId);
        if (!success) {
          this.showToast(false, 'Failed to update quantity. Please try again.');
        }
        this.updateSubtotal(); // Update subtotal after quantity change
        this.cdr.markForCheck(); // Trigger change detection
      },
      error: (error) => {
        this.processingItems.delete(item.productId);
        console.error('Error updating quantity:', error);
        this.showToast(false, error.error?.message || 'Error updating quantity.');
        this.cdr.markForCheck();
      }
    });
  }

  removeItem(productId: number): void {
    if (this.processingItems.has(productId)) {
      return;
    }

    this.processingItems.add(productId);
    
    this.cartService.removeItem(productId).subscribe({
      next: (success) => {
        this.processingItems.delete(productId);
        if (success) {
          this.showToast(true, 'Item removed from cart.');
        } else {
          this.showToast(false, 'Failed to remove item. Please try again.');
        }
        this.updateSubtotal();
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.processingItems.delete(productId);
        console.error('Error removing item:', error);
        this.showToast(false, error.error?.message || 'Error removing item.');
        this.cdr.markForCheck();
      }
    });
  }

  continueShopping(): void {
    this.router.navigate(['/products']);
  }

  proceedToCheckout(): void {
    this.cartService.syncCartWithServer().subscribe({
      next: (changeInfo) => {
        const currentItems = this.cartService.getCartItems();
        
        if (currentItems.length === 0) {
          this.showToast(false, 'Your cart is empty.');
          return;
        }

        const outOfStock = currentItems.filter(item => 
          item.availableStock < item.quantity || item.availableStock === 0
        );

        if (outOfStock.length > 0) {
          this.showToast(false, 'Some items are out of stock or exceed available quantity. Please review your cart.');
          return;
        }

        if (changeInfo.hasStockChanges) {
          this.showToast(true, 'Cart updated due to stock changes. You can now proceed to checkout.');
          setTimeout(() => {
            this.router.navigate(['/checkout']);
          }, 2000);
        } else {
          this.router.navigate(['/checkout']);
        }
      },
      error: (error) => {
        console.error('Error syncing cart:', error);
        this.showToast(false, 'Error validating cart. Please try again.');
      }
    });
  }

  isProcessing(productId: number): boolean {
    return this.processingItems.has(productId);
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

  trackByProductId(index: number, item: CartItem): number {
    return item.productId;
  }
}