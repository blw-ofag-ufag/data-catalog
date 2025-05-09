import { Component } from '@angular/core';
import { MatAccordion, MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from "@angular/material/expansion";
import { MatFormField, MatInput, MatLabel } from "@angular/material/input";

@Component({
	selector: 'index-filter-col',
	imports: [MatAccordion, MatExpansionPanel, MatExpansionPanelTitle, MatExpansionPanelHeader, MatFormField, MatLabel, MatInput, MatFormField],
	templateUrl: './index-filter-col.component.html',
	styleUrl: './index-filter-col.component.scss'
})
export class IndexFilterColComponent {}
