import { Scraper } from './scraper';
import { ApiOptions } from '../api/fnb-api';

let _instance: Scraper;
let _options: ApiOptions;

export function getScraper(options?: ApiOptions) {
	if (!_instance || (_options && options && _options.username !== options.username)) {
		_instance = new Scraper(options as ApiOptions);
		_options = options || _options;
	}

	return _instance;
}
