/**
 * Represents a field configuration that can be placed in different request slots.
 * Can either have a required key (for non-body slots) or an optional key (for body slot).
 */
export type Field =
	| {
			in: Exclude<Slot, 'body'>;
			key: string;
			map?: string;
	  }
	| {
			in: Extract<Slot, 'body'>;
			key?: string;
			map?: string;
	  };

/**
 * Configuration object for field handling and extra parameter allowance.
 */
export interface Fields {
	/** Specifies which slots allow extra parameters */
	allowExtra?: Partial<Record<Slot, boolean>>;
	/** Array of field configurations */
	args?: ReadonlyArray<Field>;
}

/**
 * Configuration array that can contain Field or Fields objects.
 */
export type FieldsConfig = ReadonlyArray<Field | Fields>;

/**
 * Available request slots where parameters can be placed.
 */
type Slot = 'body' | 'headers' | 'path' | 'query';

/**
 * Maps special prefixes to their corresponding request slots.
 */
const extraPrefixesMap: Record<string, Slot> = {
	$body_: 'body',
	$headers_: 'headers',
	$path_: 'path',
	$query_: 'query',
};

/**
 * Array of prefix-slot pairs for processing extra parameters.
 */
const extraPrefixes = Object.entries(extraPrefixesMap);

/**
 * Map structure for storing key-to-slot mappings with optional field name mapping.
 */
type KeyMap = Map<
	string,
	{
		in: Slot;
		map?: string;
	}
>;

/**
 * Builds a map of keys to their slot configurations from field configurations.
 * @param fields - Array of field configurations to process
 * @param map - Existing map to extend (optional)
 * @returns Map containing key-to-slot mappings
 */
const buildKeyMap = (fields: FieldsConfig, map?: KeyMap): KeyMap => {
	if (!map) {
		map = new Map();
	}

	for (const config of fields) {
		if ('in' in config) {
			if (config.key) {
				map.set(config.key, {
					in: config.in,
					map: config.map,
				});
			}
		} else if (config.args) {
			buildKeyMap(config.args, map);
		}
	}

	return map;
};

/**
 * Structure representing organized request parameters by slot.
 */
interface Params {
	/** Request body content */
	body: unknown;
	/** HTTP headers */
	headers: Record<string, unknown>;
	/** URL path parameters */
	path: Record<string, unknown>;
	/** Query string parameters */
	query: Record<string, unknown>;
}

/**
 * Removes empty object slots from the params structure.
 * @param params - Parameters object to clean up
 */
const stripEmptySlots = (params: Params) => {
	for (const [slot, value] of Object.entries(params)) {
		if (value && typeof value === 'object' && !Object.keys(value).length) {
			delete params[slot as Slot];
		}
	}
};

/**
 * Builds client request parameters from arguments and field configurations.
 * @param args - Array of arguments to process
 * @param fields - Configuration specifying how to map arguments to request slots
 * @returns Organized parameters object with body, headers, path, and query properties
 */
export const buildClientParams = (
	args: ReadonlyArray<unknown>,
	fields: FieldsConfig,
) => {
	const params: Params = {
		body: {},
		headers: {},
		path: {},
		query: {},
	};

	const map = buildKeyMap(fields);

	let config: FieldsConfig[number] | undefined;

	for (const [index, arg] of args.entries()) {
		if (fields[index]) {
			config = fields[index];
		}

		if (!config) {
			continue;
		}

		if ('in' in config) {
			if (config.key) {
				const field = map.get(config.key)!;
				const name = field.map || config.key;
				(params[field.in] as Record<string, unknown>)[name] = arg;
			} else {
				params.body = arg;
			}
		} else {
			for (const [key, value] of Object.entries(arg ?? {})) {
				const field = map.get(key);

				if (field) {
					const name = field.map || key;
					(params[field.in] as Record<string, unknown>)[name] = value;
				} else {
					const extra = extraPrefixes.find(([prefix]) =>
						key.startsWith(prefix),
					);

					if (extra) {
						const [prefix, slot] = extra;
						(params[slot] as Record<string, unknown>)[
							key.slice(prefix.length)
						] = value;
					} else {
						for (const [slot, allowed] of Object.entries(
							config.allowExtra ?? {},
						)) {
							if (allowed) {
								(params[slot as Slot] as Record<string, unknown>)[key] = value;
								break;
							}
						}
					}
				}
			}
		}
	}

	stripEmptySlots(params);

	return params;
};
