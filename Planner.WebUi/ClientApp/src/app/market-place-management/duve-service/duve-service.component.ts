import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-duve-service',
  templateUrl: './duve-service.component.html',
  styleUrls: ['./duve-service.component.css']
})
export class DuveServiceComponent implements OnInit {

  public statusValue: any
  
  constructor(
    private _router: Router
  ) { 
  }

  ngOnInit(): void {
    this.statusValue = history.state.option;
  }

  backPage() {
    this._router.navigate(['/market-place-management']);
  }
}
