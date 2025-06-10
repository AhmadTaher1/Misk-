import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: false,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  cartItemCount = 0;

  private cartSubscription: Subscription = new Subscription();
  private loginSubscription: Subscription = new Subscription();
  private refreshSubscription!: Subscription;
  private cartChangedSubscription!: Subscription;
  toastSuccess = true;
  toastMessage = '';
  isToastVisible = false;
  @ViewChild('toastElement') toastElement!: ElementRef;

  constructor(private authService: AuthService, private cartService: CartService, private router: Router) {}

  ngOnInit(): void {
    this.refreshState();

    this.loginSubscription = this.authService.isLoggedInObservable().subscribe((status) => {
      this.isLoggedIn = status;
    });
    
    // cart count change
    this.cartSubscription = this.cartService.cartCount$.subscribe(
      count => {
        this.cartItemCount = count;
       
        setTimeout(() => {
          this.cartItemCount = count;
        }, 0);
      }
    );

    // cart checking every 10 sec
    this.refreshSubscription = interval(10000).subscribe(() => {
      this.cartService.checkForCartChanges();
    });

    
    this.cartChangedSubscription = this.cartService.cartChanged$.subscribe((changeInfo) => {
      if (changeInfo.hasStockChanges && changeInfo.changedItems.length > 0) {
        const itemsText = changeInfo.changedItems.length === 1 
          ? `${changeInfo.changedItems[0]} has` 
          : `${changeInfo.changedItems.length} items have`;
        
        this.showToast(
          false, 
          `${itemsText} changed due to stock updates. Please check your cart.`
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.cartSubscription.unsubscribe();
    this.loginSubscription.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.cartChangedSubscription?.unsubscribe();
  }

  refreshState(): void {
    this.cartItemCount = this.cartService.getCartCount();
    setTimeout(() => {
      this.cartItemCount = this.cartService.getCartCount();
    }, 0);
  }

  logout(): void {
    this.authService.logout();

    this.cartService.clearCart();
    this.refreshState();

    this.router.navigate(['/home']);
  }



  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  goToLogin(): void {
    this.authService.setRedirectUrl(this.router.url);
    this.router.navigate(['/login']);
  }
  
  showToast(success: boolean, message: string): void {
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