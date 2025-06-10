import { Component, ElementRef, Renderer2 } from '@angular/core';
import { RegisterValidationService } from '../../services/register-validation.service';
import { RegisterService } from '../../services/register.service';
import { UserRegisterModel } from '../../models/UserRegister';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {

  userNameTouched = false;
  emailTouched = false;
  creditLimitTouched = false;
  phoneNumberTouched = false;
  passwordTouched = false;
  confirmPasswordTouched = false;


  formData: any = {
    userName: '',
    phoneNumber: '',
    email: '',
    creditLimit: '',
    password: '',
    confirmPassword: '',
  };

  errors: string[] = [];
  successMessage = '';

  constructor(
    private validator: RegisterValidationService,
    private registerService: RegisterService,
    private renderer: Renderer2, private el: ElementRef,
    private router: Router
  ) { }

  onSubmit(): void {
    this.errors = [];

    if (this.formData.password !== this.formData.confirmPassword) {
      this.errors.push('Passwords do not match.');
      return;
    }

    const validationErrors = this.validator.validateAll(this.formData);
    if (validationErrors.length > 0) {
      this.errors = validationErrors;
      return;
    }

    const user: UserRegisterModel = {
      userName: this.formData.userName,
      phoneNumber: this.formData.phoneNumber,
      email: this.formData.email,
      creditLimit: this.formData.creditLimit,
      password: this.formData.password,
    };

    this.registerService.registerUser(user).subscribe({
      next: (res) => {
        this.successMessage = 'Registration successful!';
        this.errors = [];
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (err) => {
        if (err.status === 400 && err.error && err.error.message === 'you have an already account') {
          this.errors = ['You already have an account. Please login instead.'];
        } else {
          this.errors = ['Registration failed. Please try again.'];
        }
      },
    });
  }


  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else if (field === 'confirmPassword') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

}
