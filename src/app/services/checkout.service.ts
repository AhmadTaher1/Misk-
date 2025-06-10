import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckOutService {
  private cartUrl = 'http://localhost:8085/cart';

  constructor(private http: HttpClient) {}

  getCartItems(): Observable<any> {
    return this.http.get(this.cartUrl);
  }
}
