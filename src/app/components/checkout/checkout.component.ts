import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../../services/cart.service';
import { AddressListService } from '../../services/address-list.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  standalone: false,
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  // addresses = [
  //   { addressId: 1, name: 'rejk', recipient: 'Alex', street: 'fnnfd', city: 'fdkjk' },
  //   { addressId: 2, name: 'fkkd', recipient: 'fdkj', street: 'fdf', city: 'fdfd' }
  // ];

  addresses: any[] = [];
  selectedAddressId: number | null = null;

  cartItems: { name: string; price: number; quantity: number }[] = [];

  shippingFee = 50;
  acceptTerms = false;
  showTermsModal = false;
  toastMessage: string = '';
  toastSuccess: boolean = false;
  
  @ViewChild('toastElement') toastElement!: ElementRef;

  constructor(
    private router: Router,
    private cartService: CartService,
    private addressService: AddressListService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, redirecting to /login');
      this.router.navigate(['/login']);
      return;
    }

    this.cartService.getCartItemsAsync().subscribe(items => {
      this.cartItems = items.map(item => ({
        name: item.productName,
        price: item.productPrice,
        quantity: item.quantity
      }));
    });

    this.addressService.getUserAddresses().subscribe({
      next: (res) => {
        this.addresses = res.data.useraddress;
        if (this.addresses.length > 0) {
          this.selectedAddressId = this.addresses[0].addressId;
        } else {
          this.showToast(false, 'No addresses available. Please add an address.');
        }
      },
      error: (err) => {
        console.error('Failed to load addresses:', err);
        this.showToast(false, 'Failed to load addresses. Please try again.');
      }
    });





  }

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get total(): number {
    return this.subtotal + this.shippingFee;
  }

  setAddress(addressId: number): void {
    this.selectedAddressId = addressId;
  }

  submitOrder(): void {
    
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in during submit, redirecting to /login');
      this.router.navigate(['/login']);
      return;
    }

  
    if (!this.selectedAddressId) {
      this.showToast(false, 'Please select a shipping address');
      return;
    }

    if (!this.acceptTerms) {
      this.showToast(false, 'Please accept the terms and conditions');
      return;
    }

    if (this.cartItems.length === 0) {
      this.showToast(false, 'You cannot place an order with an empty cart');
      return;
    }

    this.cartService.syncCartWithServer().subscribe({
      next: (changeInfo) => {
        if (changeInfo.hasStockChanges) {
          this.showToast(false, 'Cart updated due to stock changes. Please review your cart and try again.');
          return;
        }

        const url = `http://localhost:8085/orders?addressId=${this.selectedAddressId}`;
        
        console.log('Submitting order with addressId:', this.selectedAddressId);
        this.http.post<any>(url, {}).subscribe({
          next: (res) => {
            console.log('Order response:', res);
            if (res.success) {
              this.cartService.clearCart().subscribe({
                next: (clearSuccess) => {
                  console.log('Cart cleared:', clearSuccess);
                  const successMessage = typeof res.data === 'string' ? res.data : 'Your order has been successfully placed. You should expect delivery within 3 days.';
                  if (clearSuccess) {
                    this.showToast(true, 'Order placed successfully!');
                    this.router.navigate(['confirm-order'], {
                      queryParams: { 
                        addressId: this.selectedAddressId,
                        message: successMessage,
                        isSuccess: 'true'
                      }
                    });
                  } else {
                    this.showToast(true, 'Order placed, but failed to clear cart.');
                    this.router.navigate(['confirm-order'], {
                      queryParams: { 
                        addressId: this.selectedAddressId,
                        message: successMessage + ' Please clear cart manually.',
                        isSuccess: 'true'
                      }
                    });
                  }
                },
                error: (err) => {
                  console.error('Error clearing cart:', err);
                  this.showToast(true, 'Order placed, but error clearing cart.');
                  this.router.navigate(['confirm-order'], {
                    queryParams: { 
                      addressId: this.selectedAddressId,
                      message: 'Your order has been successfully placed. Please clear cart manually.',
                      isSuccess: 'true'
                    }
                  });
                }
              });
            } else {
              const errorMessage = res.msg || 'Failed to place order. Please try again.';
              console.log('Order failed:', errorMessage);
              if (errorMessage === 'Your order exceeds your credit limit.' || errorMessage === 'Failed to place order. Please try again.') {
                this.router.navigate(['confirm-order'], {
                  queryParams: { 
                    message: errorMessage,
                    isSuccess: 'false'
                  }
                });
              } else {
                this.showToast(false, errorMessage);
              }
            }
          },
          error: (err) => {
            console.error('Error placing order:', err);
            const errorMessage = err.error?.message || 'Something went wrong while processing your order. Please try again.';
            if (errorMessage === 'Your order exceeds your credit limit.' || errorMessage === 'Failed to place order. Please try again.') {
              this.router.navigate(['confirm-order'], {
                queryParams: { 
                  message: errorMessage,
                  isSuccess: 'false'
                }
              });
            } else {
              this.showToast(false, errorMessage);
            }
          }
        });
      },
      error: (err) => {
        console.error('Error syncing cart:', err);
        this.showToast(false, 'Error syncing cart. Please try again.');
      }
    });
  }

  discardOrder(): void {
    console.log('Order discarded');
    this.router.navigate(['/cart']);
  }

  openTermsModal(): void {
    this.showTermsModal = true;
  }

  closeTermsModal(): void {
    this.showTermsModal = false;
  }

  private showToast(success: boolean, message: string): void {
    this.toastSuccess = success;
    this.toastMessage = message;

    setTimeout(() => {
      if (this.toastElement?.nativeElement) {
        const toast = new (window as any).bootstrap.Toast(this.toastElement.nativeElement);
        toast.show();
      }
    }, 100);
  }
}