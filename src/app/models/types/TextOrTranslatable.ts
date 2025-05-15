import {Deutsch, English, Francais, Italiano} from '../schemas/dataset';

export type TextOrTranslatable =
	| string
	| {
			de?: Deutsch;
			fr?: Francais;
			it?: Italiano;
			en?: English;
	  };
