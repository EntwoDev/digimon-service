const DigimonRepository = require('../repositories/DigimonRepository');
const MaximoRepository = require('../repositories/MaximoRepository');
const PlamoRepository = require('../repositories/PlamoRepository');
const logger = require('../utils/logger');
const { formatDate } = require('../utils/time');

class MonitoringService {
    monthData = [
        { label: 'jan', val: 1 },
        { label: 'feb', val: 2 },
        { label: 'mar', val: 3 },
        { label: 'aprl', val: 4 },
        { label: 'mei', val: 5 },
        { label: 'juni', val: 6 },
        { label: 'juli', val: 7 },
        { label: 'aug', val: 8 },
        { label: 'sept', val: 9 },
        { label: 'okt', val: 10 },
        { label: 'nov', val: 11 },
        { label: 'des', val: 12 },
    ];

    constructor() {
        this.plamoRepository = new PlamoRepository();
        this.digimonRepository = new DigimonRepository();
        this.maximoRepository = new MaximoRepository();

        // Cache variables
        this.cacheData = null;
        this.lastFetchTime = 0;
        this.cacheDuration = parseInt(process.env.CACHE_DURATION_MS || '1000', 10);
        this.activeClients = 0;
    }

    async getData(res, reqMeta = {}) {
        this.activeClients += 1;
        const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        logger.info(`[SSE] Client connected [id=${clientId}] (active: ${this.activeClients})`, {
            clientId,
            ip: reqMeta.ip,
        });

        const interval = setInterval(async () => {
            try {
                const currentTime = Date.now();
                let dataToSend = {};

                if (!this.cacheData || currentTime - this.lastFetchTime > this.cacheDuration) {
                    const status = await this.digimonRepository.loadStatus();
                    const daily = await this.maximoRepository.loadDaily();
                    const om = (await this.maximoRepository.loadNetProdToday()) || [];
                    const avg = (await this.maximoRepository.loadAvg()) || [];
                    const resStat = (await this.digimonRepository.loadResStat()) ?? null;
                    let bulan = [];
                    let data = {};

                    if (resStat && resStat.stStatus == 1) {
                        bulan = (await this.digimonRepository.loadSummary()) || [];
                        data = {
                            daily: daily,
                            tnetprod: om.map((item) => item.TARGETNETPRODU3 / 1000) ?? [],
                            tncf: om.map((item) => item.TARGETCFU3) ?? [],
                            netprod: om.map((item) => parseFloat(item.NETPROD3) / 1000) ?? [],
                            ncf: om.map((item) => parseFloat(item.U3NCF)) ?? [],
                            nphr: om.map((item) => parseFloat(item.NPHR3)) ?? [],
                            tnphr: om.map((item) => parseFloat(item.TARGETNPHRU3)) ?? [],
                            tanggal: om.map((item) => formatDate(item.TANGGAL)) ?? [],
                            averagenphr: avg[0] ?? null,
                            status: status ?? null,
                            bulan: bulan ?? [],
                            st: resStat.stStatus ?? null,
                        };
                    } else {
                        bulan = await Promise.all(
                            this.monthData.map(async (item) => {
                                const maximoData = await this.maximoRepository.loadSummary(item.val);
                                return {
                                    [item.label]: maximoData,
                                };
                            })
                        );
                        data = { bulan };
                    }

                    this.cacheData = data;
                    this.lastFetchTime = currentTime;
                    dataToSend = data;
                } else {
                    dataToSend = this.cacheData;
                }

                res.write(`data: ${JSON.stringify(dataToSend)}\n\n`);
            } catch (error) {
                // Gunakan throttled error agar log disk tidak penuh saat terjadi error berulang tiap detik
                logger.throttledError(
                    'monitoring-getdata',
                    `Monitoring Service Error: ${error.message}`,
                    { clientId }
                );
                res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            }
        }, 1000);

        res.on('close', () => {
            clearInterval(interval);
            this.activeClients = Math.max(0, this.activeClients - 1);
            logger.info(`[SSE] Client disconnected [id=${clientId}] (active: ${this.activeClients})`, {
                clientId,
            });
            res.end();
        });
    }
}

module.exports = new MonitoringService();
