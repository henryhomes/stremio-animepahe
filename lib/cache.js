
const redis = require('redis').createClient({
  host: 'redis-14394.c16.us-east-1-3.ec2.cloud.redislabs.com',
  port: 14394,
  password: process.env.REDIS_PASS
})

redis.on('error', err => { console.error('Redis error', err) })

const mapToAp = {}
const streams = {}

function toJson(str) {
	let data
	try {
		data = JSON.parse(str)
	} catch(e) {
		console.error('Redis parse error', e)
	}
	return data
}

module.exports = {
	map: {
		get: (kitsuId, cb) => {
			if (!kitsuId) cb()
			else {
				if (mapToAp[kitsuId]) cb(mapToAp[kitsuId])
				else
					redis.get('kitsu-ap-' + kitsuId, (err, apId) => {
						if (!err && apId) cb(apId)
						else cb()
					})
			}
		},
		set: (kitsuId, data) => {
			if (!mapToAp[kitsuId]) {
				mapToAp[kitsuId] = data
				redis.set('kitsu-ap-' + kitsuId, data)
			}
		}
	},
	get: (key, cacheMaxAge, cb) => {

		if (streams[key]) {
			cb({ streams: streams[key], cacheMaxAge })
			return
		}

		redis.get(key, (err, redisRes) => {

			if (!err && redisRes) {
				const redisStreams = toJson(redisRes)
				if (redisStreams) {
					cb({ streams: redisStreams, cacheMaxAge })
					return
				}
			}
			cb()
		})

	},
	set: (key, data) => {
		// cache forever
		streams[key] = data
		redis.set(key, JSON.stringify(data))
	},
	catalog: {
		set: (key, page, data) => {
			if (!key) return
			const redisKey = 'ap-catalog-' + key + (page > 1 ? ('-' + page) : '')
			redis.set(redisKey, JSON.stringify(data))
		},
		get: (key, page, cb) => {
			if (!key) {
				cb()
				return
			}
			const redisKey = 'ap-catalog-' + key + (page > 1 ? ('-' + page) : '')
			redis.get(redisKey, (err, redisRes) => {

				if (!err && redisRes) {
					const redisCatalog = toJson(redisRes)
					if (redisCatalog) {
						cb(redisCatalog)
						return
					}
				}
				cb()
			})
		}
	}
}
