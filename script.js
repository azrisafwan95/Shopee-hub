const SUPABASE_URL = 'https://wzjucotepgqhcmgidgda.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1zE-aPwB_AHU7hU_yaUI9Q_zWplLCSL';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_PASSWORD = "123";

let allProducts = [];
let currentCategory = 'Semua';

async function loadProducts() {
  const { data, error } = await _supabase.from('products').select('*').order('id', { ascending: false });
  if (error) return;
  allProducts = data;
  generateSidebarCategories();
  filterProducts();
}

// 1. FUNGSI SIDEBAR
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (sidebar.classList.contains('sidebar-hidden')) {
    sidebar.classList.replace('sidebar-hidden', 'sidebar-visible');
    overlay.classList.remove('hidden');
  } else {
    sidebar.classList.replace('sidebar-visible', 'sidebar-hidden');
    overlay.classList.add('hidden');
  }
}

// 2. JANA KATEGORI DALAM SIDEBAR
function generateSidebarCategories() {
  const list = document.getElementById('category-list');
  const categories = ['Semua', ...new Set(allProducts.map(p => p.category).filter(c => c))];

  list.innerHTML = '';
  categories.forEach(cat => {
    const isActive = currentCategory === cat;
    list.innerHTML += `
      <button onclick="setCategory('${cat}')" class="text-left py-3 px-4 rounded-xl text-sm font-bold transition-all ${isActive ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-50 text-gray-600'} uppercase tracking-wider">
        ${cat}
      </button>
    `;
  });
}

function setCategory(cat) {
  currentCategory = cat;
  document.getElementById('active-cat-label').innerText = "Kategori: " + cat;
  toggleSidebar(); // Tutup menu selepas pilih
  generateSidebarCategories(); // Update UI list
  filterProducts();
}

// 3. DISPLAY PRODUK
function filterProducts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const container = document.getElementById('product-list');
  const isAdminOpen = !document.getElementById('admin-panel').classList.contains('hidden');

  let filtered = allProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm);
    const matchCategory = currentCategory === 'Semua' || p.category === currentCategory;
    return matchSearch && matchCategory;
  });

  container.innerHTML = '';
  filtered.forEach(p => {
    const discount = p.original_price ? Math.round((p.original_price - p.price) / p.original_price * 100) : 0;
    const deleteBtn = isAdminOpen ? `<button onclick="deleteProduct(${p.id})" class="absolute top-2 right-2 bg-red-600 text-white w-7 h-7 rounded-full text-[10px] z-20 font-bold shadow-lg flex items-center justify-center italic">X</button>` : '';

    container.innerHTML += `
      <div class="relative bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden transition-all active:scale-95 italic">
        ${deleteBtn}
        ${discount > 0 ? `<div class="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg z-10 shadow-sm not-italic font-sans animate-pulse">-${discount}%</div>` : ''}
        <img src="${p.image_url}" class="w-full h-44 object-cover bg-gray-50" onerror="this.src='https://via.placeholder.com/300x300?text=Error'">
        <div class="p-4 flex flex-col flex-grow text-left">
          <h2 class="text-[12px] font-bold text-gray-700 line-clamp-2 mb-1 leading-tight h-8 font-sans not-italic">${p.name}</h2>
          <div class="flex items-center gap-1 mb-2 font-sans not-italic">
            <span class="text-[9px] font-bold text-gray-700 font-sans">⭐ ${p.rating || 5}.0</span>
            <span class="text-[9px] text-gray-300 font-bold ml-1">| Terjual ${p.sold_count || 0}</span>
          </div>
          <div class="mb-3 font-sans not-italic">
            ${p.original_price ? `<p class="text-[10px] text-gray-400 line-through leading-none decoration-red-300 italic">RM${p.original_price.toFixed(2)}</p>` : ''}
            <p class="text-orange-600 font-black text-lg italic leading-tight">RM${p.price.toFixed(2)}</p>
          </div>
          ${p.review_text ? `<div class="bg-orange-50 p-2.5 rounded-2xl mb-4 border border-orange-100"><p class="text-[9px] text-orange-800 leading-relaxed italic font-medium font-sans">" ${p.review_text} "</p></div>` : ''}
          <a href="${p.affiliate_url}" target="_blank" class="block w-full shopee-gradient text-white text-[10px] font-black py-3 rounded-2xl text-center uppercase tracking-tighter not-italic font-sans shadow-md shadow-orange-100 mt-auto">BELI SEKARANG</a>
        </div>
      </div>`;
  });
}

// 4. SIMPAN PRODUK
async function saveProduct() {
  const pass = document.getElementById('admin-pass').value;
  const name = document.getElementById('p-name').value;
  const price = document.getElementById('p-price').value;
  const originalPrice = document.getElementById('p-original-price').value;
  const sold = document.getElementById('p-sold').value;
  const category = document.getElementById('p-category').value;
  const rating = document.getElementById('p-rating').value;
  const review = document.getElementById('p-review').value;
  const link = document.getElementById('p-link').value;
  const fileInput = document.getElementById('p-image-file');
  const btn = document.getElementById('btn-save');

  if (pass !== ADMIN_PASSWORD) return alert("Password Salah!");
  if (!name || !price || !link || fileInput.files.length === 0) return alert("Isi semua info!");

  btn.innerText = "⏳ Sedang Publish...";
  btn.disabled = true;

  try {
    const file = fileInput.files[0];
    const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
    await _supabase.storage.from('product-image').upload(fileName, file);
    const { data: urlData } = _supabase.storage.from('product-image').getPublicUrl(fileName);

    await _supabase.from('products').insert([{
      name, price: parseFloat(price),
      original_price: originalPrice ? parseFloat(originalPrice) : null,
      sold_count: parseInt(sold) || 0,
      category: category || 'Lain-lain',
      rating: parseInt(rating),
      review_text: review,
      image_url: urlData.publicUrl,
      affiliate_url: link }]);


    alert("✅ Berjaya!");
    location.reload();
  } catch (err) {alert(err.message);}
}

async function deleteProduct(id) {
  const pass = document.getElementById('admin-pass').value;
  if (pass !== ADMIN_PASSWORD) return alert("Isi password admin!");
  if (confirm("Padam barang ni?")) {
    await _supabase.from('products').delete().eq('id', id);
    loadProducts();
  }
}

function toggleAdmin() {
  document.getElementById('admin-panel').classList.toggle('hidden');
  filterProducts();
}

loadProducts();