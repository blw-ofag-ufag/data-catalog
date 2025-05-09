import { Component } from '@angular/core';
import {MatTableModule} from '@angular/material/table';

@Component({
  selector: 'index-list',
  templateUrl: './index-list.component.html',
  styleUrl: './index-list.component.scss',
	imports: [MatTableModule]
})
export class IndexListComponent {
}
