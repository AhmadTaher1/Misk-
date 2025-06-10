import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { CartItemDto,CartResponse,ApiResponse, CartItem } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:8085/cart';
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();
  private cartItems: CartItem[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    
    if (this.authService.isLoggedIn()) {
      this.loadCartFromAPI();
    }

   
    this.authService.isLoggedInObservable().subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadCartFromAPI();
      } else {
        this.clearLocalCart();
      }
    });
  }

  
  loadCartFromAPI(): void {
    if (!this.authService.isLoggedIn()) {
      this.clearLocalCart();
      return;
    }

    this.http.get<ApiResponse<CartResponse>>(`${this.apiUrl}`).pipe(
      catchError(error => {
        console.error('Error loading cart:', error);
        this.clearLocalCart();
        return of({ success: false, message: 'Error loading cart', data: { items: [], totalItems: 0, totalPrice: 0 } });
      })
    ).subscribe(response => {
      if (response.success && response.data) {
        this.cartItems = response.data.items || [];
        this.updateCartCount();
      } else {
        this.clearLocalCart();
      }
    });
  }

  //local copy
  getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  // unique 
  getCartCount(): number {
    return this.cartItems.length;
  }

  
  getTotalQuantity(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

 
  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => total + item.totalPrice, 0);
  }

  
  addItem(productId: number, quantity: number = 1): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    return this.http.post<ApiResponse<CartResponse>>(`${this.apiUrl}/add`, null, {
      params: {
        productId: productId.toString(),
        quantity: quantity.toString()
      }
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.cartItems = response.data.items || [];
          this.updateCartCount();
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Error adding item to cart:', error);
        return of(false);
      })
    );
  }

  
  updateItemQuantity(productId: number, quantity: number): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    if (quantity <= 0) {
      return this.removeItem(productId);
    }

    return this.http.put<ApiResponse<CartResponse>>(`${this.apiUrl}/update`, null, {
      params: {
        productId: productId.toString(),
        quantity: quantity.toString()
      }
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.cartItems = response.data.items || [];
          this.updateCartCount();
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Error updating cart item:', error);
        return of(false);
      })
    );
  }

  
  removeItem(productId: number): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    return this.http.delete<ApiResponse<CartResponse>>(`${this.apiUrl}/remove`, {
      params: {
        productId: productId.toString()
      }
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.cartItems = response.data.items || [];
          this.updateCartCount();
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Error removing item from cart:', error);
        return of(false);
      })
    );
  }

  
  clearCart(): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      this.clearLocalCart();
      return of(true);
    }

    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/clear`).pipe(
      tap(response => {
        if (response.success) {
          this.clearLocalCart();
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Error clearing cart:', error);
        this.clearLocalCart(); 
        return of(true);
      })
    );
  }

  // for a specific product
  getItemQuantity(productId: number): number {
    const item = this.cartItems.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  }

  
  bulkAddToCart(items: CartItemDto[]): Observable<boolean> {
    if (!this.authService.isLoggedIn()) {
      return of(false);
    }

    return this.http.post<ApiResponse<CartResponse>>(`${this.apiUrl}/bulk-add`, items).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.cartItems = response.data.items || [];
          this.updateCartCount();
        }
      }),
      map(response => response.success),
      catchError(error => {
        console.error('Error bulk adding to cart:', error);
        return of(false);
      })
    );
  }

  // for verification
  getCartCountFromAPI(): Observable<number> {
    if (!this.authService.isLoggedIn()) {
      return of(0);
    }

    return this.http.get<ApiResponse<number>>(`${this.apiUrl}/count`).pipe(
      map(response => response.success ? (response.data || 0) : 0),
      catchError(error => {
        console.error('Error getting cart count:', error);
        return of(0);
      })
    );
  }

  canAddToCart(productId: number, requestedQuantity: number): boolean {
    const cartItem = this.cartItems.find(item => item.productId === productId);
    if (!cartItem) {
      return true; 
    }
    
    return (cartItem.quantity + requestedQuantity) <= cartItem.availableStock;
  }


  getAvailableStock(productId: number): number {
    const cartItem = this.cartItems.find(item => item.productId === productId);
    return cartItem ? cartItem.availableStock : 0;
  }


  isProductOutOfStock(productId: number): boolean {
    const cartItem = this.cartItems.find(item => item.productId === productId);
    return cartItem ? cartItem.availableStock <= 0 : false;
  }


  private clearLocalCart(): void {
    this.cartItems = [];
    this.updateCartCount();
  }

  private updateCartCount(): void {
    const count = this.getCartCount();
    this.cartCountSubject.next(count);
  }

  // force
  refreshCart(): void {
    this.loadCartFromAPI();
  }
}