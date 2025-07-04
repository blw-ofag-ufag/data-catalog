import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {ObUnknownRouteModule} from '@oblique/oblique';
import {HomeComponent} from './home/home.component';
import {IndexComponent} from './index/index.component';
import {DetailsComponent} from './details/details.component';
import {AboutComponent} from './about/about.component';
import {HandbookComponent} from './handbook/handbook.component';
import {ModifyComponent} from './modify/modify.component';

const routes: Routes = [
	{path: '', redirectTo: 'index', pathMatch: 'full'},
	{path: 'home', component: HomeComponent},
	{path: 'index', component: IndexComponent},
	{path: 'details', component: DetailsComponent},
	{path: 'about', component: AboutComponent},
	{path: 'handbook', component: HandbookComponent},
	{path: 'modify', component: ModifyComponent},
	{path: '**', redirectTo: 'unknown-route'}
];

@NgModule({
	imports: [RouterModule.forRoot(routes, { useHash: true }), ObUnknownRouteModule],
	exports: [RouterModule]
})
export class AppRoutingModule {}
