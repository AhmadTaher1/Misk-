import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailsComponent } from './components/product-details/product-details.component';
import { TrendingProductsComponent } from './components/trending-products/trending-products.component';
import { ProductComponent } from './components/product/product.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ProfileComponent } from './components/profile/profile.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { ConfirmOrderComponent } from './components/confirm-order/confirm-order.component';
import { AdminUsersComponent } from './components/admin/admin-users/admin-users.component';
import { AdminProductsComponent } from './components/admin/admin-products/admin-products.component';
import { AdminOrdersComponent } from './components/admin/admin-orders/admin-orders.component';
import { AdminProductEditComponent } from './components/admin/admin-product-edit/admin-product-edit.component';
import { AdminProductAddComponent } from './components/admin/admin-product-add/admin-product-add.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { CartComponent } from './components/cart/cart.component';
import { Error403Component } from './errors/error403/error403.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: TrendingProductsComponent },
      { path: 'products', component: ProductComponent },
      { path: 'product-details', component: ProductDetailsComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'checkout', component: CheckoutComponent },
      { path: 'confirm-order', component: ConfirmOrderComponent },
      { path: 'cart', component: CartComponent },
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'users', component: AdminUsersComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'products/add', component: AdminProductAddComponent },
      { path: 'products/:id/edit', component: AdminProductEditComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: '', redirectTo: 'users', pathMatch: 'full' },
    ]
  },
  { path: 'error/403', component: Error403Component },
  { path: '**', redirectTo: '/home' },



];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
