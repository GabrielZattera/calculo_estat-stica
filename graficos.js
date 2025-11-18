// graficos.js - lê 'rol_values' do localStorage e monta tabelas + gráficos
(function(){
    function readROLFromStorage(){
        try{
            if(window.storage && typeof window.storage.loadROL === 'function'){
                return window.storage.loadROL().filter(v => String(v).trim() !== '');
            }
            const raw = localStorage.getItem('rol_values');
            if(!raw) return [];
            const arr = JSON.parse(raw);
            if(!Array.isArray(arr)) return [];
            return arr.filter(v => String(v).trim() !== '');
        } catch(e){
            console.warn('Erro lendo rol_values', e);
            return [];
        }
    }

    function buildFrequency(values){
        const freq = {};
        values.forEach(v=>{
            const k = String(v).trim();
            freq[k] = (freq[k]||0) + 1;
        });
        return freq;
    }

    function buildCumulative(freqArr){
        const cumul = [];
        let acc = 0;
        for(const [val,fa] of freqArr){
            acc += fa;
            cumul.push([val, acc]);
        }
        return cumul;
    }

    function renderTablesAndCharts(){
        const values = readROLFromStorage();
        // We intentionally no longer populate HTML tables here; this page shows only charts.
        if(values.length === 0){
            // destroy any existing charts and exit early
            if(window._charts){ window._charts.forEach(c=>{ try{ c.destroy(); }catch(e){} }); }
            window._charts = [];
            return;
        }

        // Frequencies
        const freq = buildFrequency(values);
        // sort keys by numeric if possible, else by locale
        const keys = Object.keys(freq).sort((a,b)=>{
            const na = Number(String(a).replace(',','.'));
            const nb = Number(String(b).replace(',','.'));
            if(!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b), 'pt-BR', {sensitivity:'base'});
        });
        const freqArr = keys.map(k=>[k, freq[k]]);

        // cumulative
        const cumulArr = buildCumulative(freqArr);
        // cumulArr available for charts but we don't populate tables on this page

        // percentages
        const total = values.length;
        // percentages computed below for charts

        // Prepare data for charts
        const labels = freqArr.map(r=>r[0]);
        const counts = freqArr.map(r=>r[1]);
        const cumulValues = cumulArr.map(r=>r[1]);
        const percentages = freqArr.map(r=> total ? (r[1]/total*100) : 0);

        // Destroy existing charts if any (safe-guard)
        if(window._charts){
            window._charts.forEach(c=>{ try{ c.destroy(); }catch(e){} });
        }
        window._charts = [];

        // Chart 1: Horizontal bar (barra) — mostra FA
        const ctx1 = document.getElementById('chart-bar-horizontal').getContext('2d');
        const chart1 = new Chart(ctx1, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Frequência Absoluta (FA)', data: counts, backgroundColor: 'rgba(54,162,235,0.7)' }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Frequência Absoluta (FA)' } } }
        });
        window._charts.push(chart1);

        // Chart 2: Line — mostra FAA (acumulada)
        const ctx2 = document.getElementById('chart-line').getContext('2d');
        const chart2 = new Chart(ctx2, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Frequência Absoluta Acumulada (FAA)', data: cumulValues, borderColor: 'rgba(75,192,192,1)', backgroundColor: 'rgba(75,192,192,0.25)', fill: true }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Frequência Absoluta Acumulada (FAA)' }, legend: { display: false } } }
        });
        window._charts.push(chart2);

        // Chart 3: Column (vertical bar) — mostra FA
        const ctx3 = document.getElementById('chart-column').getContext('2d');
        const chart3 = new Chart(ctx3, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Frequência Absoluta (FA)', data: counts, backgroundColor: 'rgba(255,159,64,0.7)' }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Frequência Absoluta (FA) — Coluna' }, legend: { display: false } } }
        });
        window._charts.push(chart3);

        // Chart 4: Pie (percentual) — mostra FR (%)
        const ctx4 = document.getElementById('chart-pie').getContext('2d');
        const colors = labels.map((_,i)=> `hsl(${(i*360/labels.length).toFixed(0)},70%,55%)`);
        const chart4 = new Chart(ctx4, {
            type: 'pie',
            data: { labels, datasets: [{ data: percentages, backgroundColor: colors, label: 'Frequência Relativa (%)' }] },
            options: { responsive: true, plugins: { title: { display: true, text: 'Frequência Relativa (%)' }, tooltip: { callbacks: { label: function(ctx){ const v = ctx.raw; return `${ctx.label}: ${v.toFixed(2)}%`; } } } } }
        });
        window._charts.push(chart4);
    }

    // Attach load button so charts are only drawn when user requests
    document.addEventListener('DOMContentLoaded', ()=>{
        const btn = document.getElementById('load-rol-btn');
        if(btn){
            btn.addEventListener('click', ()=>{ renderTablesAndCharts(); window._chartsLoaded = true; });
        }
    });

    // Also listen to storage events so charts refresh if ROL changed in another tab,
    // but only if the user already loaded the charts on this page.
    window.addEventListener('storage', function(e){
        if(e.key === 'rol_values' && window._chartsLoaded) renderTablesAndCharts();
    });
})();
