import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({providedIn: 'root'})
export class DebugService {
	private readonly debugEnabled$ = new BehaviorSubject<boolean>(false);

	readonly isDebugEnabled$ = this.debugEnabled$.asObservable();

	toggleDebug(): boolean {
		const newValue = !this.debugEnabled$.value;
		this.debugEnabled$.next(newValue);
		console.log(`🔧 Field debug mode: ${newValue ? 'enabled' : 'disabled'}`);
		return newValue;
	}

	isDebugEnabled(): boolean {
		return this.debugEnabled$.value;
	}
}
