import { Component, Inject, InjectionToken, OnInit, Optional } from '@angular/core';
import { AuthorizeService, AuthenticationResultStatus } from '../authorize.service';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginActions, QueryParameterNames, ApplicationPaths, ReturnUrlType } from '../api-authorization.constants';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountClient, LoginQuery, ProcessResponse } from 'src/app/core/autogenerated-clients/api-client';
import { ToastrService } from 'ngx-toastr';
import { LoadingService } from 'src/app/core/services/loading.service';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient, HttpEvent, HttpHeaders, HttpResponseBase } from '@angular/common/http';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

// The main responsibility of this component is to handle the user's login process.
// This is the starting point for the login process. Any component that needs to authenticate
// a user can simply perform a redirect to this component with a returnUrl query parameter and
// let the component perform the login and return back to the return url.
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  public message = new BehaviorSubject<string>(null);

  private baseUrl: string;

  loginForm: FormGroup;
  hidePasswordText: boolean;
  submitted: boolean;
  validationMessages: any;
  private returnUrl: string;


  constructor(
    private authorizeService: AuthorizeService,
    private accountClient: AccountClient,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public loading: LoadingService,
    private toastr: ToastrService,
    private formBuilder: FormBuilder,
    private _cookieService: CookieService,
    private httpClient: HttpClient, @Optional() @Inject(API_BASE_URL) baseUrl?: string
  ) {

    this.baseUrl = baseUrl !== undefined && baseUrl !== null ? baseUrl : "";
    this.hidePasswordText = true;
    this.submitted = false;
    this.validationMessages = {
      'username': [
        { type: 'required', message: 'Required' }
      ],
      'password': [
        { type: 'required', message: 'Required' }
      ]
    };
  }

  async ngOnInit() {
    this.initForm();

    // LoginComponent handles multiple different URLs.
    // By default those are:
    // 1. authentication/login
    // 2. authentication/login-callback
    // 3. authentication/login-failed

    const action = this.activatedRoute.snapshot.url[1];
    switch (action.path) {
      case LoginActions.Login:
        this._cookieService.deleteAll('hotel_group_key');
        this._cookieService.deleteAll('hotel_group_id');

        // REMOVE EVERYTHING FROM LOCALSTORAGE THAT STARTS WITH oidc.
        if (!!localStorage) {
          let localStorageKeys = Object.keys(localStorage);
          for (let key of localStorageKeys) {
            if (key.indexOf("oidc.") === 0) {
              localStorage.removeItem(key);
            }
          }
        }
        break;
      // If the URL is authentication/login-callback
      case LoginActions.LoginCallback:
        await this._processLoginCallback();
        break;
      // If the URL is authentication/login-failed
      case LoginActions.LoginFailed:
        const message = this.activatedRoute.snapshot.queryParamMap.get(QueryParameterNames.Message);
        this.message.next(message);
        break;
    }
  }

  private async initForm() {
    this.loginForm = this.formBuilder.group({
      hotelGroup: ['', Validators.required],
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  private async _login(returnUrl: string): Promise<void> {
    const state: INavigationState = { returnUrl };

    // The authorization service is calling the authorization endpoint
    const result = await this.authorizeService.signIn(state);
    this.message.next(undefined);

    // The service can return:
    // 1. AuthenticationResultStatus.Redirect - Authorization returned a redirect status. Since we don't redirect anywhere to display login form (we are already there), we simply do nothing.
    // 2. AuthenticationResultStatus.Success - Authorization was successfull and we can redirect where the user initially wanted to go.
    // 3. AuthenticationResultStatus.Fail - Authorization failed and we redirect to authorization failed URL.

    switch (result.status) {
      case AuthenticationResultStatus.Redirect:
        // Authorization endpoint returned redirect authorization.
        // We don't do anything since we already are on the login form.
        break;
      case AuthenticationResultStatus.Success:
        // Authorization success, we can redirect where the user wanted to go.
        await this._navigateToReturnUrl(returnUrl);
        break;
      case AuthenticationResultStatus.Fail:
        // Authorization failed, we redirect to the login failed component with the message in the query parameters.
        // This will ultimately redirect back to the login component with a message about failed login which is exactly what we want.
        // The user must log back in again.
        await this.router.navigate(ApplicationPaths.LoginFailedPathComponents, {
          queryParams: { [QueryParameterNames.Message]: result.message }
        });
        break;
      default:
        throw new Error(`Invalid status result ${(result as any).status}.`);
    }
  }

  private async _processLoginCallback(): Promise<void> {
    const url = window.location.href;
    const result = await this.authorizeService.completeSignIn(url);
    switch (result.status) {
      case AuthenticationResultStatus.Redirect:
        // There should not be any redirects as completeSignIn never redirects.
        throw new Error('Should not redirect.');
      case AuthenticationResultStatus.Success:
        await this._navigateToReturnUrl(this.getReturnUrl(result.state));
        break;
      case AuthenticationResultStatus.Fail:
        this.message.next(result.message);
        break;
    }
  }

  private async _navigateToReturnUrl(returnUrl: string) {
    // It's important that we do a replace here so that we remove the callback uri with the
    // fragment containing the tokens from the browser history.
    await this.router.navigateByUrl(returnUrl, {
      replaceUrl: true
    });
  }

  private getReturnUrl(state?: INavigationState): string {
    const fromQuery = (this.activatedRoute.snapshot.queryParams as INavigationState).returnUrl;
    return (state && state.returnUrl) ||
      fromQuery ||
      ApplicationPaths.DefaultLoginRedirectPath;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.toastr.error('Please correct input and try again.');
      return;
    }

    this.loading.start();
    this._cookieService.deleteAll('hotel_group_key');
    this._cookieService.deleteAll('hotel_group_id');
    this._cookieService.set('hotel_group_key', this.loginForm.controls.hotelGroup.value, 365, '/');

    // REMOVE EVERYTHING FROM LOCALSTORAGE THAT STARTS WITH oidc.
    if (!!localStorage) {
      let localStorageKeys = Object.keys(localStorage);
      for (let key of localStorageKeys) {
        if (key.indexOf("oidc.") === 0) {
          localStorage.removeItem(key);
        }
      }
    }

    let loginQuery = new LoginQuery({
      hotelGroup: this.loginForm.controls.hotelGroup.value,
      username: this.loginForm.controls.username.value,
      password: this.loginForm.controls.password.value,
      rememberMe: false
    });

    this.accountClient.login(loginQuery).subscribe((response: ProcessResponse) => {
        if (response.isSuccess) {
          this._login(this.getReturnUrl());
        } else {
          this.toastr.error(response.message);
          this.loading.stop();
        }
      },
      (error: Error) => {
        this.toastr.error(error.message);
        this.loading.stop();
      },
      () => {

      }
    );
  }
}

interface INavigationState {
  [ReturnUrlType]: string;
}
