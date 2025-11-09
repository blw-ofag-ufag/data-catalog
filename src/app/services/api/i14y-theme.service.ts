import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';

export interface I14YTheme {
	code: string;
	labels: {
		de: string;
		fr: string;
		it: string;
		en: string;
	};
}

@Injectable({
	providedIn: 'root'
})
export class I14YThemeService {
	private readonly I14Y_API_BASE = 'https://www.i14y.admin.ch/api';
	private readonly THEMES_CONCEPT_ID = '08da58dc-4dc8-f9cb-b6f2-7d16b3fa0cde';

	private readonly themesSubject = new BehaviorSubject<I14YTheme[]>([]);
	public themes$ = this.themesSubject.asObservable();

	// Fallback themes based on current implementation
	private readonly fallbackThemes: I14YTheme[] = [
		{
			code: 'administration',
			labels: {
				de: 'Verwaltung',
				fr: 'Administration',
				it: 'Amministrazione',
				en: 'Administration'
			}
		},
		{
			code: 'agriculture',
			labels: {
				de: 'Landwirtschaft',
				fr: 'Agriculture',
				it: 'Agricoltura',
				en: 'Agriculture'
			}
		},
		{
			code: 'construction',
			labels: {
				de: 'Bau',
				fr: 'Construction',
				it: 'Costruzione',
				en: 'Construction'
			}
		},
		{
			code: 'crime',
			labels: {
				de: 'Kriminalität',
				fr: 'Criminalité',
				it: 'Criminalità',
				en: 'Crime'
			}
		},
		{
			code: 'culture',
			labels: {
				de: 'Kultur',
				fr: 'Culture',
				it: 'Cultura',
				en: 'Culture'
			}
		},
		{
			code: 'education',
			labels: {
				de: 'Bildung',
				fr: 'Éducation',
				it: 'Educazione',
				en: 'Education'
			}
		},
		{
			code: 'energy',
			labels: {
				de: 'Energie',
				fr: 'Énergie',
				it: 'Energia',
				en: 'Energy'
			}
		},
		{
			code: 'finances',
			labels: {
				de: 'Finanzen',
				fr: 'Finances',
				it: 'Finanze',
				en: 'Finances'
			}
		},
		{
			code: 'geography',
			labels: {
				de: 'Geographie',
				fr: 'Géographie',
				it: 'Geografia',
				en: 'Geography'
			}
		},
		{
			code: 'health',
			labels: {
				de: 'Gesundheit',
				fr: 'Santé',
				it: 'Salute',
				en: 'Health'
			}
		},
		{
			code: 'industry',
			labels: {
				de: 'Industrie',
				fr: 'Industrie',
				it: 'Industria',
				en: 'Industry'
			}
		},
		{
			code: 'legislation',
			labels: {
				de: 'Gesetzgebung',
				fr: 'Législation',
				it: 'Legislazione',
				en: 'Legislation'
			}
		},
		{
			code: 'mobility',
			labels: {
				de: 'Mobilität',
				fr: 'Mobilité',
				it: 'Mobilità',
				en: 'Mobility'
			}
		},
		{
			code: 'national-economy',
			labels: {
				de: 'Volkswirtschaft',
				fr: 'Économie nationale',
				it: 'Economia nazionale',
				en: 'National economy'
			}
		},
		{
			code: 'politics',
			labels: {
				de: 'Politik',
				fr: 'Politique',
				it: 'Politica',
				en: 'Politics'
			}
		},
		{
			code: 'population',
			labels: {
				de: 'Bevölkerung',
				fr: 'Population',
				it: 'Popolazione',
				en: 'Population'
			}
		},
		{
			code: 'prices',
			labels: {
				de: 'Preise',
				fr: 'Prix',
				it: 'Prezzi',
				en: 'Prices'
			}
		},
		{
			code: 'public-order',
			labels: {
				de: 'Öffentliche Ordnung',
				fr: 'Ordre public',
				it: 'Ordine pubblico',
				en: 'Public order'
			}
		},
		{
			code: 'social-security',
			labels: {
				de: 'Soziale Sicherheit',
				fr: 'Sécurité sociale',
				it: 'Sicurezza sociale',
				en: 'Social security'
			}
		},
		{
			code: 'statistical-basis',
			labels: {
				de: 'Statistische Grundlagen',
				fr: 'Bases statistiques',
				it: 'Basi statistiche',
				en: 'Statistical basis'
			}
		},
		{
			code: 'territory',
			labels: {
				de: 'Raum',
				fr: 'Territoire',
				it: 'Territorio',
				en: 'Territory'
			}
		},
		{
			code: 'tourism',
			labels: {
				de: 'Tourismus',
				fr: 'Tourisme',
				it: 'Turismo',
				en: 'Tourism'
			}
		},
		{
			code: 'trade',
			labels: {
				de: 'Handel',
				fr: 'Commerce',
				it: 'Commercio',
				en: 'Trade'
			}
		},
		{
			code: 'work',
			labels: {
				de: 'Arbeit',
				fr: 'Travail',
				it: 'Lavoro',
				en: 'Work'
			}
		}
	];

	constructor(private readonly http: HttpClient) {
		// Initialize with fallback themes
		this.themesSubject.next(this.fallbackThemes);
	}

	/**
	 * Load themes from I14Y API
	 */
	loadThemes(): Observable<I14YTheme[]> {
		// First attempt to load from I14Y API
		return this.loadFromI14Y().pipe(
			catchError(error => {
				console.warn('Failed to load themes from I14Y API, using fallback:', error);
				// Return fallback themes if API fails
				return of(this.fallbackThemes);
			}),
			tap(themes => {
				this.themesSubject.next(themes);
			})
		);
	}

	/**
	 * Get themes from I14Y API
	 */
	private loadFromI14Y(): Observable<I14YTheme[]> {
		const url = `${this.I14Y_API_BASE}/concepts/${this.THEMES_CONCEPT_ID}/content`;

		return this.http.get<any>(url).pipe(
			map(response => {
				// Parse I14Y response and extract themes with multilingual labels
				return this.parseI14YResponse(response);
			})
		);
	}

	/**
	 * Parse I14Y API response to extract theme codes and labels
	 */
	private parseI14YResponse(response: any): I14YTheme[] {
		// This would need to be implemented based on the actual I14Y API response structure
		// For now, return fallback themes
		return this.fallbackThemes;
	}

	/**
	 * Get current themes
	 */
	getThemes(): I14YTheme[] {
		return this.themesSubject.value;
	}

	/**
	 * Get theme labels for a specific code
	 */
	getThemeLabels(code: string): I14YTheme['labels'] | null {
		const theme = this.themesSubject.value.find(t => t.code === code);
		return theme ? theme.labels : null;
	}

	/**
	 * Get theme codes for enum compatibility
	 */
	getThemeCodes(): string[] {
		return this.themesSubject.value.map(theme => theme.code);
	}
}
