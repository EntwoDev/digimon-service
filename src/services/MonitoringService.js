const DigimonRepository = require('../repositories/DigimonRepository');
const MaximoRepository = require('../repositories/MaximoRepository');
const PlamoRepository = require('../repositories/PlamoRepository');
const logger = require('../utils/logger');
const { formatDate } = require('../utils/time');

class MonitoringService {
    monthData = [
        {
            'label': 'jan',
            'val': 1,
        },
        {
            'label': 'feb',
            'val': 2,
        },
        {
            'label': 'mar',
            'val': 3,
        },
        {
            'label': 'aprl',
            'val': 4,
        },
        {
            'label': 'mei',
            'val': 5,
        },
        {
            'label': 'juni',
            'val': 6,
        },
        {
            'label': 'juli',
            'val': 7,
        },
        {
            'label': 'aug',
            'val': 8,
        },
        {
            'label': 'sept',
            'val': 9,
        },
        {
            'label': 'okt',
            'val': 10,
        },
        {
            'label': 'nov',
            'val': 11,
        },
        {
            'label': 'des',
            'val': 12,
        },
    ];

    constructor() {
        this.plamoRepository = new PlamoRepository();
        this.digimonRepository = new DigimonRepository();
        this.maximoRepository = new MaximoRepository();
    }

    async getData(res) {
        const interval = setInterval(async () => {
            try {
                const loadnet = await this.plamoRepository.loadNet();
                const status = await this.digimonRepository.loadStatus();
                const daily = await this.maximoRepository.loadDaily();
                const om = await this.maximoRepository.loadNetProdToday();
                const avg = await this.maximoRepository.loadAvg();
                const resStat = await this.digimonRepository.loadResStat() ?? null;
                let bulan = [];
                let data = {};

                if (resStat && resStat.stStatus == 1) {
                    bulan = await this.digimonRepository.loadSummary();
                } else {
                    bulan = this.monthData.map(async (item, key) => {
                        data = await this.maximoRepository.loadSummary(item.val);
                        return {
                            [item.label]: data
                        }
                    });
                }

                data ={
                    "0": loadnet[0],
                    "1": loadnet[1],
                    "2": loadnet[2],
                    "daily": daily,
                    "netprod": om.map(item => parseFloat(item.NETPROD3) / 1000) ?? [],
                    "ncf": om.map(item => parseFloat(item.U3NCF)) ?? [],
                    "nphr": om.map(item => parseFloat(item.NPHR3)) ?? [],
                    "tnphr": om.map(item => parseFloat(item.TARGETNPHRU3)) ?? [],
                    "tanggal": om.map(item => formatDate(item.TANGGAL)) ?? [],
                    "averagenphr": avg[0] ?? null,
                    "status": status ?? null,
                    "bulan": bulan ?? [],
                    "st": resStat.stStatus ?? null,
                };

                res.write(`data: ${JSON.stringify(data)}\n\n`)
            } catch (error) {
                logger.error(`Monitoring Service Error: ${error.message}`);
                res.write(`event: error\ndata: ${JSON.stringify(error.message)}\n\n`);
            }
        }, 1000);

        res.on('close', () => {
            clearInterval(interval);
            res.end();
        });
    }
}

module.exports = new MonitoringService();