import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { BannerComponent } from './components/banner/banner.component';
import { BeforeFooterComponent } from './components/before-footer/before-footer.component';
import { ProductComponent } from './components/product/product.component';
import { TrendingProductsComponent } from './components/trending-products/trending-products.component';
import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { ConfirmOrderComponent } from './components/confirm-order/confirm-order.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminOrdersComponent } from './components/admin/admin-orders/admin-orders.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminProductsComponent } from './components/admin/admin-products/admin-products.component';
import { AdminProductEditComponent } from './components/admin/admin-product-edit/admin-product-edit.component';
import { AdminProductAddComponent } from './components/admin/admin-product-add/admin-product-add.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { CartComponent } from './components/cart/cart.component';

import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth/auth.interceptor';
import { Error403Component } from './errors/error403/error403.component';

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    NavbarComponent,
    BannerComponent,
    BeforeFooterComponent,
    ProductComponent,
    TrendingProductsComponent,
    ProductDetailsComponent,
    LoginComponent,
    RegisterComponent,
    ProfileComponent,
    CheckoutComponent,
    ConfirmOrderComponent,
    CartComponent,
    // Admin components
    AdminLayoutComponent,
    AdminOrdersComponent,
    AdminUsersComponent,
    AdminProductsComponent,
    AdminProductEditComponent,
    AdminProductAddComponent,
    MainLayoutComponent,
    Error403Component
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    NgxSliderModule,
    HttpClientModule
    // No components here!
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
