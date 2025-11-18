// --- Tabela de Frequências dinâmica ---
const defaultFreqTableNames = [
	'Analfabetos',
	'Fundamental Incompleto',
	'Fundamental Completo',
	'Ensino Médio Incompleto',
	'Ensino Médio Completo',
	'Superior Incompleto',
	'Superior Completo'
];

function getNamesFromROL() {
	// Try to get values from localStorage first
	try {
		// load stored rol via storage wrapper when available
		let arr = [];
		if(window.storage && typeof window.storage.loadROL === 'function'){
			arr = window.storage.loadROL();
		} else {
			const gen = localStorage.getItem('rol_generated');
			if(gen === '1'){
				const raw = localStorage.getItem('rol_values');
				if(raw) arr = JSON.parse(raw) || [];
			}
		}
		if(Array.isArray(arr) && arr.length>0){
			if(!isDefaultRol(arr)){
				const seen = new Set();
				const uniq = [];
				arr.forEach(v => {
					const s = String(v).trim();
					if (s !== '' && !seen.has(s)) { seen.add(s); uniq.push(s); }
				});
				if(uniq.length>0) return uniq;
			}
		}
	} catch (e) {
		console.warn('Erro ao ler rol_values para nomes:', e);
	}

	// Fallback: try to infer from Dados Brutos inputs
	try {
		const inputs = Array.from(document.querySelectorAll('#dados-brutos .data-cell'));
		const vals = inputs.map(i => (i.value || '').trim()).filter(v => v !== '');
		if (vals.length > 0) {
			const seen = new Set();
			const uniq = [];
			vals.forEach(v => {
				if (!seen.has(v)) { seen.add(v); uniq.push(v); }
			});
			if (uniq.length > 0) return uniq;
		}
	} catch (e) {
		// ignore
	}

	// no data -> return empty array (table will be blank)
	return [];
}

function isDefaultRol(arr){
	if(!Array.isArray(arr)) return false;
	if(arr.length !== defaultFreqTableNames.length) return false;
	for(let i=0;i<arr.length;i++){
		if(String(arr[i]).trim() !== String(defaultFreqTableNames[i]).trim()) return false;
	}
	return true;
}

function renderFreqTable(names){
	// names: optional array of strings. If provided, render rows for these names.
	// If not provided, don't auto-populate from storage on load (keep blank).
	const tableName = document.getElementById('table-name')?.value?.trim() || 'Sem nome';
	document.getElementById('freq-table-name').textContent = tableName;
	const tbody = document.getElementById('freq-table-body');
	if (!tbody) return;
	tbody.innerHTML = '';

	if(!Array.isArray(names) || names.length === 0){
		// intentionally leave table blank unless explicit names passed
		return;
	}

	// Render rows dynamically based on provided names
	names.forEach((nome, idx) => {
		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>${nome}</td>
			<td><input type="number" min="0" class="fa-input" data-idx="${idx}" style="width:70px;text-align:center" /></td>
			<td class="faa-cell"></td>
			<td class="fr-cell"></td>
			<td class="fra-cell"></td>
		`;
		tbody.appendChild(tr);
	});
}

function updateFreqTableCalcs() {
	const faInputs = Array.from(document.querySelectorAll('.fa-input'));
	const faaCells = Array.from(document.querySelectorAll('.faa-cell'));
	const frCells = Array.from(document.querySelectorAll('.fr-cell'));
	const fraCells = Array.from(document.querySelectorAll('.fra-cell'));

	// Get numeric FA values; treat empty as missing
	const faValues = faInputs.map(input => {
		const s = (input.value || '').toString().trim();
		if (s === '') return null;
		const n = Number(s);
		return Number.isFinite(n) ? n : null;
	});

	const total = faValues.reduce((acc, v) => acc + (v || 0), 0);

	// If there's no data (all null or total === 0), clear derived cells
	const hasAny = faValues.some(v => v !== null && v !== 0);
	if (!hasAny || total === 0) {
		faaCells.forEach(c => c.textContent = '');
		frCells.forEach(c => c.textContent = '');
		fraCells.forEach(c => c.textContent = '');
		return;
	}

	// Calculate FAA, FR, FRA
	let faa = 0;
	let fraAcc = 0;
	faValues.forEach((fa, idx) => {
		const v = fa || 0; // treat missing as 0 for accumulation
		faa += v;
		faaCells[idx].textContent = faa;
		const fr = total ? (v / total * 100) : 0;
		fraAcc += fr;
		frCells[idx].textContent = fr.toFixed(2) + '%';
		fraCells[idx].textContent = fraAcc.toFixed(2) + '%';
	});
}

function setupFreqTableListeners() {
	// Atualiza cálculos ao editar FA
	document.getElementById('freq-table-body')?.addEventListener('input', updateFreqTableCalcs);
	// Atualiza nome da tabela no cabeçalho
	document.getElementById('table-name')?.addEventListener('input', () => {
		document.getElementById('freq-table-name').textContent = document.getElementById('table-name').value.trim() || 'Sem nome';
	});
}

document.addEventListener('DOMContentLoaded', () => {
	// Start with an empty frequency table; listeners are attached.
	setupFreqTableListeners();
});
// ...existing code...
(function(){
	// Lê todos os valores da tabela de dados brutos
	function readDadosBrutos(){
		const inputs = Array.from(document.querySelectorAll('#dados-brutos .data-cell'));
		const values = inputs.map(i => (i.value || '').trim()).filter(v => v !== '');
		return values;
	}

	// Determina se todos os valores são numéricos
	function allNumeric(arr){
		if(arr.length === 0) return false;
		return arr.every(v => !Number.isNaN(Number(String(v).replace(',','.'))));
	}

	// Ordena conforme tipo
	function sortValues(values, type){
		const copy = values.slice();
		if(type === 'numeric'){
			return copy.sort((a,b)=> Number(String(a).replace(',','.')) - Number(String(b).replace(',','.')));
		}
		if(type === 'alpha'){
			return copy.sort((a,b)=> String(a).localeCompare(String(b), 'pt-BR', {sensitivity: 'base'}));
		}
		// auto
		if(allNumeric(copy)) return sortValues(copy, 'numeric');
		return sortValues(copy, 'alpha');
	}

	// Preenche a tabela ROL (4 colunas x 10 linhas) com os valores ordenados
	function populateROL(sorted){
		const cells = Array.from(document.querySelectorAll('#rol-table .rol-cell'));
		// limpa todas
		cells.forEach(c => c.textContent = '');
		// preenche em ordem row-major
		for(let i=0;i<cells.length;i++){
			if(i < sorted.length){
				cells[i].textContent = sorted[i];
			} else {
				cells[i].textContent = '';
			}
		}

		// gerar painel de informações (frequências)
		const info = document.getElementById('info-content');
		if(!info) return;
		if(sorted.length === 0){
			info.textContent = 'Nenhuma informação gerada.';
			return;
		}
		const freq = {};
		sorted.forEach(v=>{
			const k = String(v).trim();
			freq[k] = (freq[k]||0) + 1;
		});
		// formata como no anexo: cada linha 'Label: count,' e finaliza com '.'
		const lines = Object.keys(freq).map(k => `${k}: ${freq[k]},`);
		if(lines.length>0){
			// substituir última vírgula por ponto
			const lastIdx = lines.length-1;
			lines[lastIdx] = lines[lastIdx].replace(/,$/,'.');
		}
		info.textContent = lines.join('\n');

		// Persistir os valores do ROL para que outras páginas (ex: graficos.html) possam ler
		try{
			if(window.storage && typeof window.storage.saveROL === 'function'){
				window.storage.saveROL(sorted);
			} else {
				localStorage.setItem('rol_values', JSON.stringify(sorted));
				localStorage.setItem('rol_generated', '1');
			}
		} catch(e){
			console.warn('Não foi possível salvar rol_values no localStorage', e);
		}

		// Re-render frequency table to reflect new unique names
		try{ 
			// build unique names from sorted array and pass explicitly
			const seen = new Set();
			const uniq = [];
			sorted.forEach(v=>{ const s = String(v).trim(); if(s!=='' && !seen.has(s)){ seen.add(s); uniq.push(s);} });
			renderFreqTable(uniq);
		}catch(e){/* ignore */}
	}

	// Limpa inputs, células ROL e painel de informações
	function clearAll(){
		document.querySelectorAll('#dados-brutos .data-cell').forEach(i=> i.value = '');
		document.querySelectorAll('#rol-table .rol-cell').forEach(c=> c.textContent = '');
		const info = document.getElementById('info-content');
		if(info) info.textContent = 'Nenhuma informação gerada.';

		// remover persistência caso exista
		try{
			if(window.storage && typeof window.storage.clearROL === 'function'){
				window.storage.clearROL();
			} else {
				localStorage.removeItem('rol_values');
				localStorage.removeItem('rol_generated');
			}
		} catch(e){
			console.warn('Não foi possível remover rol_values do localStorage', e);
		}

		// Re-render frequency table to fallback names
		try{ renderFreqTable(); }catch(e){/* ignore */}
	}

	// Event listeners
	document.addEventListener('DOMContentLoaded', ()=>{
		const applyBtn = document.getElementById('apply-btn');
		const clearBtn = document.getElementById('clear-btn');
		const sortType = document.getElementById('sort-type');
		const tableNameInput = document.getElementById('table-name');
		const tableNameDisplay = document.getElementById('table-name-display');

		applyBtn.addEventListener('click', ()=>{
			const values = readDadosBrutos();
			if(values.length === 0){
				alert('Não há dados para organizar. Preencha a tabela de Dados Brutos.');
				return;
			}
			// atualiza nome exibido antes de organizar
			if(tableNameInput && tableNameDisplay){
				tableNameDisplay.textContent = tableNameInput.value.trim() || 'Sem nome';
			}
			const type = sortType.value;
			if(type === 'numeric' && !allNumeric(values)){
				const ok = confirm('Alguns valores não são numéricos. Deseja ordenar alfabeticamente em vez disso?');
				if(!ok) return;
			}
			const sorted = sortValues(values, type);
			populateROL(sorted);
		});

		clearBtn.addEventListener('click', ()=>{
			if(confirm('Limpar todos os dados brutos e o ROL?')) clearAll();
		});

		// atualizar exibição do nome em tempo real
		if(tableNameInput && tableNameDisplay){
			tableNameInput.addEventListener('input', ()=>{
				tableNameDisplay.textContent = tableNameInput.value.trim() || 'Sem nome';
			});
		}
	});
})();

// Atualiza o ano do rodapé dinamicamente, se existir
(function(){
    try{
        document.addEventListener('DOMContentLoaded', ()=>{
            const el = document.getElementById('anoAtual');
            if(el) el.textContent = new Date().getFullYear();
        });
    }catch(e){console.warn(e)}
})();

