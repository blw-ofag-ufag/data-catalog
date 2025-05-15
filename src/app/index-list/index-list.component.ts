import { Component, Input } from "@angular/core";
import {MatTableModule} from '@angular/material/table';
import { Observable } from "rxjs";
import { DatasetSchema } from "../models/schemas/dataset";

@Component({
  selector: 'index-list',
  templateUrl: './index-list.component.html',
  styleUrl: './index-list.component.scss',
	imports: [MatTableModule]
})
export class IndexListComponent {
	@Input() datasets$!: Observable<DatasetSchema[] | null>;
}
