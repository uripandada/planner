import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ProcessResponseOfIEnumerableOfRoleListModel, RoleClient, RoleListModel } from '../autogenerated-clients/api-client';

@Injectable({ providedIn: 'root' })
export class RoleListDataResolver implements Resolve<Observable<ProcessResponseOfIEnumerableOfRoleListModel>> {
  constructor(private roleClient: RoleClient) { }

  resolve() {
    return this.roleClient.getRolesList();
  }
}
