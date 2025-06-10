// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
//
// @Component({
//   selector: 'app-checkout',
//   standalone: false,
//   templateUrl: './checkout.component.html',
//   styleUrl: './checkout.component.css'
// })
// export class CheckoutComponent {
//   addresses = [
//     { addressId: 1, name: 'rejk', recipient: 'Alex', street: 'fnnfd', city: 'fdkjk' },
//     { addressId: 2, name: 'fkkd', recipient: 'fdkj', street: 'fdf', city: 'fdfd' }
//   ];
//
//   cartItems = [
//     { name: 'llfkflg', price: 125, quantity: 1 }
//   ];
//
//   shippingFee = 50;
//   selectedAddressId: number | null = null;
//   acceptTerms = false;
//   showTermsModal = false;
//
//   constructor (private router: Router) {}
//
//   get subtotal(): number {
//     return this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
//   }
//
//   get total(): number {
//     return this.subtotal + this.shippingFee;
//   }
//
//   setAddress(addressId: number): void {
//     this.selectedAddressId = addressId;
//   }
//
//   submitOrder(): void {
//     if (!this.selectedAddressId) {
//       alert('Please select a shipping address');
//       return;
//     }
//
//     if (!this.acceptTerms) {
//       alert('Please accept the terms and conditions');
//       return;
//     }
//
//     // Here you would typically call a service to submit the order
//     console.log('Order submitted with address ID:', this.selectedAddressId);
//
//     this.router.navigate(["confirm-order"]);
//   }
//
//   discardOrder(): void {
//     // Redirect to cart
//     console.log('Order discarded');
//   }
//
//   openTermsModal(): void {
//     this.showTermsModal = true;
//   }
//
//   closeTermsModal(): void {
//     this.showTermsModal = false;
//   }
// }
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CheckOutService } from '../../services/checkout.service';
import { AddressListService } from '../../services/address-list.service';

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

  constructor(private router: Router, private cartService: CheckOutService,private addressService: AddressListService) {}

  ngOnInit(): void {
    this.cartService.getCartItems().subscribe({
      next: (response) => {
        this.cartItems = response.data.items.map((item: any) => ({
          name: item.productName,
          price: item.productPrice,
          quantity: item.quantity
        }));
      },
      error: (err) => {
        console.error('Failed to load cart items:', err);
      }
    });

    this.addressService.getUserAddresses().subscribe({
      next: (res) => {
        this.addresses = res.data.useraddress;
        if (this.addresses.length > 0) {
          this.selectedAddressId = this.addresses[0].addressId;
        }
      },
      error: (err) => {
        console.error('Failed to load addresses:', err);
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
    if (!this.selectedAddressId) {
      alert('Please select a shipping address');
      return;
    }

    if (!this.acceptTerms) {
      alert('Please accept the terms and conditions');
      return;
    }
    if (this.cartItems.length == 0) {
      alert('you cannot place an order with an empty cart');
      return;
    }



    this.router.navigate(['confirm-order'], {
      queryParams: { addressId: this.selectedAddressId }
    });

  }

  discardOrder(): void {
    console.log('Order discarded');
  }

  openTermsModal(): void {
    this.showTermsModal = true;
  }

  closeTermsModal(): void {
    this.showTermsModal = false;
  }
}
