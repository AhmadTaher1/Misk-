// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
//
// @Component({
//   selector: 'app-confirm-order',
//   standalone: false,
//   templateUrl: './confirm-order.component.html',
//   styleUrl: './confirm-order.component.css'
// })
// export class ConfirmOrderComponent {
//   constructor (private router: Router) {}
//
//   homeNavigate() {
//     this.router.navigate(["home"]);
//   }
// }


import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-confirm-order',
  templateUrl: './confirm-order.component.html',
  standalone: false,
  styleUrls: ['./confirm-order.component.css']
})
export class ConfirmOrderComponent implements OnInit {
  selectedAddressId: number | null = null;
 // isSuccess: boolean = true;
  message: string = 'Your order has been successfully placed. You should expect delivery within 3 days.';
  imageSrc: string = 'img/order_confirmed.png';
  title: string = 'Thank You for Your Purchase!';

  constructor(private router: Router, private http: HttpClient,private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const id = params['addressId'];
      if (id) {
        this.selectedAddressId = +id;
        this.submitOrder(this.selectedAddressId);
      } else {
        this.setErrorState("No address selected for the order.");
      }
    });
  }

  submitOrder(addressId: number): void {
    const url = `http://localhost:8085/orders?addressId=${addressId}`;
    this.http.post<any>(url, {}).subscribe({
      next: (res) => {
        console.log(res.data);
        if (res.success) {

            this.message = res.data;
            this.imageSrc = 'img/order_confirmed.png';
            this.title = 'Thank You for Your Purchase!';

        } else {
          this.message = res.msg;
          this.imageSrc = 'img/issue.png';
          this.title = 'The winds do not blow as the ships wish';
        }
      },
      error: (err) => {
        console.error('HTTP Error:', err);

        // err.error contains the backend response body when there's an error
        const errorMessage = err.error?.message || 'Something went wrong while processing your order. Please try again later.';

        this.setErrorState(errorMessage);
      }
    });

    console.log(this.selectedAddressId);

  }

  setErrorState(msg: string): void {
    // this.isSuccess = false;
    this.message = msg;
    this.imageSrc = 'img/issue.png';
    this.title = 'The winds do not blow as the ships wish';
  }

  homeNavigate() {
    this.router.navigate(["home"]);
  }
}

