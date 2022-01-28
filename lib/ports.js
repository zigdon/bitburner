/* @returns {Object.<string.number>} */
export function getPorts() {
    return {
        WORKERS: 1,
        CONTROLLER: 2,
        CONTROLLER_CTL: 3,
        BUYER_CTL: 4,
        LOGGER: 5,
        WEAKENERS: 6,
        LOGGER_CTL: 7,
        CRON_CTL: 8,
        CPROXY: 9,
        BATCHMON: 10,
    }
}