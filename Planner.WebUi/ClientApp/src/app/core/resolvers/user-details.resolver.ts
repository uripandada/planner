import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ProcessResponseOfUserModel, UserManagementClient } from '../autogenerated-clients/api-client';

@Injectable({ providedIn: 'root' })
export class UserDetailsDataResolver implements Resolve<Observable<ProcessResponseOfUserModel>> {
  constructor(private userManagementClient: UserManagementClient) { }

  resolve(routeSnapshot: ActivatedRouteSnapshot) {
    const userId: string = routeSnapshot.queryParams['userId'];
    return this.userManagementClient.getUserById(userId);
  }
}
