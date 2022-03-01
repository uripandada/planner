import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AssetGridItemData, AssetManagementClient, GetListOfUsersQuery, GetPageOfAssetsQuery, PageOfOfAssetGridItemData, UserListItemData, UserManagementClient } from '../autogenerated-clients/api-client';

@Injectable({ providedIn: 'root' })
export class AssetListResolver implements Resolve<Observable<Array<AssetGridItemData>>> {
  constructor(private client: AssetManagementClient) { }

  resolve(routeSnapshot: ActivatedRouteSnapshot) {
    return this.client.getPageOfAssets(new GetPageOfAssetsQuery({ skip: 0, take: 0, assetGroupId: null, keywords: null, sortKey: "NAME_ASC" })).pipe(
      map((response: PageOfOfAssetGridItemData) => {
        return response.items;
      })
    );
  }
}