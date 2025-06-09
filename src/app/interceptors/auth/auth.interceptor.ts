import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    const userRole = localStorage.getItem('role'); // assumed to be 'USER' or 'ADMIN'

    // If route contains /admin and role is not ADMIN, block it
    if (req.url.includes('/admin') && userRole !== 'ADMIN') {
      this.router.navigate(['/error/403']);
      return throwError(() => new Error('403 - Forbidden: Admins only'));
    }

    if (token) {
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next.handle(cloned);
    }
    
    return next.handle(req);
  }
}
