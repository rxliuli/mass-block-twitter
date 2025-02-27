
export function extractObjects(json: any, matcher: (obj: any) => boolean) {
	let results: any[] = []

	function traverse(obj: any) {
		if (matcher(obj)) {
			results.push(obj)
		}
		for (let key in obj) {
			if (typeof obj[key] === 'object') {
				traverse(obj[key])
			}
		}
	}

	traverse(json)
	return results
}
