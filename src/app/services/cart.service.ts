import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { CartItemDto, CartResponse, ApiResponse, CartItem } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = 'http://localhost:8085/cart';
  private cartCountSubject = new BehaviorSubject<number>(0);
  public cartCount$ = this.cartCountSubject.asObservable();
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();
  private cartChangedSubject = new Subject<{ hasStockChanges: boolean; changedItems: string[] }>();
  public cartChanged$ = this.cartChangedSubject.asObservable();

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
        this.cartItemsSubject.next([...this.cartItems]);
        this.updateCartCount();
      } else {
        this.clearLocalCart();
      }
    });
  }

  getCartItemsAsync(): Observable<CartItem[]> {
    return this.cartItems$;
  }

  checkForCartChanges(): void {
    if (!this.authService.isLoggedIn()) return;

    this.http.get<ApiResponse<CartResponse>>(`${this.apiUrl}`).pipe(
      catchError(error => {
        console.error('Error checking cart:', error);
        return of({ success: false, message: 'Error', data: { items: [], totalItems: 0, totalPrice: 0 } });
      })
    ).subscribe(response => {
      if (response.success && response.data) {
        const newItems = response.data.items || [];
        const changeInfo = this.detectAndHandleChanges(newItems);
        
        if (changeInfo.hasChanges) {
          const quantityAdjustedItems = newItems.filter(newItem => {
            const existingItem = this.cartItems.find(item => item.productId === newItem.productId);
            return existingItem && newItem.quantity !== existingItem.quantity;
          });

          this.updateCartItems(newItems);
          this.cartItemsSubject.next([...this.cartItems]);
          this.updateCartCount();
          
          if (changeInfo.hasStockChanges && quantityAdjustedItems.length > 0) {
            this.syncQuantityChangesToDB(quantityAdjustedItems).subscribe(syncSuccess => {
              if (syncSuccess) {
                console.log('Quantity changes synced to database successfully');
              } else {
                console.error('Failed to sync some quantity changes to database');
              }
            });
          }
          
          this.cartChangedSubject.next({
            hasStockChanges: changeInfo.hasStockChanges,
            changedItems: changeInfo.changedItems
          });
        }
      }
    });
  }

  private detectAndHandleChanges(newItems: CartItem[]): {
    hasChanges: boolean;
    hasStockChanges: boolean;
    changedItems: string[];
    quantityAdjustedItems: CartItem[];
  } {
    let hasChanges = false;
    let hasStockChanges = false;
    const changedItems: string[] = [];
    const quantityAdjustedItems: CartItem[] = [];

    for (const newItem of newItems) {
      const existingItem = this.cartItems.find(item => item.productId === newItem.productId);
      
      if (existingItem) {
        if (newItem.quantity !== existingItem.quantity) {
          hasChanges = true;
          hasStockChanges = true;
          changedItems.push(newItem.productName);
          quantityAdjustedItems.push(newItem);
        }
        
        if (newItem.availableStock !== existingItem.availableStock) {
          hasChanges = true;
          if (newItem.availableStock < existingItem.quantity) {
            hasStockChanges = true;
            if (!changedItems.includes(newItem.productName)) {
              changedItems.push(newItem.productName);
            }
          }
        }
      }
    }

    for (const existingItem of this.cartItems) {
      const stillExists = newItems.find(item => item.productId === existingItem.productId);
      if (!stillExists) {
        hasChanges = true;
        hasStockChanges = true;
        changedItems.push(existingItem.productName);
      }
    }

    return { hasChanges, hasStockChanges, changedItems, quantityAdjustedItems };
  }

  syncCartWithServer(): Observable<{ hasStockChanges: boolean; changedItems: string[] }> {
    if (!this.authService.isLoggedIn()) {
      return of({ hasStockChanges: false, changedItems: [] });
    }

    return this.http.get<ApiResponse<CartResponse>>(`${this.apiUrl}`).pipe(
      map(response => {
        if (response.success && response.data) {
          const newItems = response.data.items || [];
          const changeInfo = this.detectAndHandleChanges(newItems);
          
          if (changeInfo.hasChanges) {
            this.updateCartItems(newItems);
            this.cartItemsSubject.next([...this.cartItems]);
            this.updateCartCount();
          }
          
          return {
            hasStockChanges: changeInfo.hasStockChanges,
            changedItems: changeInfo.changedItems
          };
        }
        return { hasStockChanges: false, changedItems: [] };
      }),
      catchError(error => {
        console.error('Error syncing cart:', error);
        return of({ hasStockChanges: false, changedItems: [] });
      })
    );
  }

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
          const newItem = response.data.items?.find(item => item.productId === productId);
          if (newItem) {
            const existingItemIndex = this.cartItems.findIndex(item => item.productId === productId);
            if (existingItemIndex >= 0) {
              this.cartItems[existingItemIndex] = { ...newItem };
            } else {
              this.cartItems.push({ ...newItem });
            }
            this.cartItemsSubject.next([...this.cartItems]);
            this.updateCartCount();
            console.log('Item added successfully:', this.cartItems);
          }
        } else {
          console.error('Failed to add item:', response.message);
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
          const updatedItem = response.data.items?.find(item => item.productId === productId);
          if (updatedItem) {
            const index = this.cartItems.findIndex(item => item.productId === productId);
            if (index >= 0) {
              // update only the changed in place
              this.cartItems[index].quantity = updatedItem.quantity;
              this.cartItems[index].totalPrice = updatedItem.totalPrice;
              this.cartItems[index].availableStock = updatedItem.availableStock;
              //to notify subscribers
              this.cartItemsSubject.next([...this.cartItems]);
              this.updateCartCount();
              console.log('Cart updated successfully:', this.cartItems);
            }
          }
        } else {
          console.error('Failed to update cart:', response.message);
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
          this.cartItems = this.cartItems.filter(item => item.productId !== productId);
          this.cartItemsSubject.next([...this.cartItems]);
          this.updateCartCount();
          console.log('Item removed successfully:', this.cartItems);
        } else {
          console.error('Failed to remove item:', response.message);
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
          this.updateCartItems(response.data.items || []);
          this.cartItemsSubject.next([...this.cartItems]);
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
    this.cartItemsSubject.next([...this.cartItems]);
    this.updateCartCount();
  }

  private updateCartCount(): void {
    const count = this.getCartCount();
    this.cartCountSubject.next(count);
  }

  private updateCartItems(newItems: CartItem[]): void {
    this.cartItems = this.cartItems.filter(existingItem => 
      newItems.some(newItem => newItem.productId === existingItem.productId)
    );

    newItems.forEach(newItem => {
      const index = this.cartItems.findIndex(item => item.productId === newItem.productId);
      if (index >= 0) {
        this.cartItems[index] = { ...newItem };
      } else {
        this.cartItems.push({ ...newItem });
      }
    });
  }

  refreshCart(): void {
    this.loadCartFromAPI();
  }

  private syncQuantityChangesToDB(changedItems: CartItem[]): Observable<boolean> {
    if (!this.authService.isLoggedIn() || changedItems.length === 0) {
      return of(false);
    }

    const updateRequests = changedItems.map(item => 
      this.http.put<ApiResponse<CartResponse>>(`${this.apiUrl}/update`, null, {
        params: {
          productId: item.productId.toString(),
          quantity: item.quantity.toString()
        }
      }).pipe(
        catchError(error => {
          console.error(`Error updating quantity for product ${item.productId}:`, error);
          return of({ success: false, message: 'Error updating quantity', data: null });
        })
      )
    );

    return new Observable<boolean>(observer => {
      if (updateRequests.length === 0) {
        observer.next(false);
        observer.complete();
        return;
      }

      let completedRequests = 0;
      let hasErrors = false;

      updateRequests.forEach(request => {
        request.subscribe(response => {
          completedRequests++;
          if (!response.success) {
            hasErrors = true;
          }

          if (completedRequests === updateRequests.length) {
            observer.next(!hasErrors);
            observer.complete();
          }
        });
      });
    });
  }
}