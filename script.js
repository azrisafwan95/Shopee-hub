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

function filterProducts() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const container = document.getElementById('product-list');
  const isAdminOpen = !document.getElementById('admin-panel').classList.contains('hidden');

  let filtered = allProducts.filter(p => p.name.toLowerCase().includes(searchTerm) && (currentCategory === 'Semua' || p.category === currentCategory));

  container.innerHTML = '';
  filtered.forEach(p => {
    const discount = p.original_price ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
    const deleteBtn = isAdminOpen ? `<button onclick="deleteProduct(${p.id})" class="absolute top-2 right-2 bg-red-600 text-white w-7 h-7 rounded-full text-[10px] z-30 font-bold shadow-lg flex items-center justify-center">X</button>` : '';

    // LOGIK MULTIPLE IMAGES (SLIDER)
    let imageContent = '';
    const imgList = p.images && p.images.length > 0 ? p.images : [p.image_url];
    
    imageContent = `
      <div class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full h-44 bg-gray-50">
        ${imgList.map(img => `<img src="${img}" class="w-full h-44 object-cover flex-shrink-0 snap-center" onerror="this.src='https://via.placeholder.com/300'">`).join('')}
      </div>
      ${imgList.length > 1 ? `<div class="absolute bottom-2 right-2 bg-black/50 text-white text-[8px] px-2 py-0.5 rounded-full z-10">↔ Slide</div>` : ''}
    `;

    container.innerHTML += `
      <div class="relative bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden transition-all active:scale-95 italic font-serif">
        ${deleteBtn}
        ${discount > 0 ? `<div class="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-lg z-20 shadow-sm not-italic font-sans">-${discount}%</div>` : ''}
        
        <div class="relative">${imageContent}</div>

        <div class="p-4 flex flex-col flex-grow text-left">
          <h2 class="text-[12px] font-bold text-gray-700 line-clamp-2 mb-1 h-8 font-sans not-italic leading-tight">${p.name}</h2>
          <div class="flex items-center gap-1 mb-2 font-sans not-italic text-[9px] font-bold text-gray-400">⭐ ${p.rating || 5}.0 | Terjual ${p.sold_count || 0}</div>
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

async function saveProduct() {
  const pass = document.getElementById('admin-pass').value;
  const fileInput = document.getElementById('p-image-file');
  const btn = document.getElementById('btn-save');

  if (pass !== ADMIN_PASSWORD) return alert("Password Salah!");
  if (fileInput.files.length === 0) return alert("Pilih sekurang-kurangnya 1 gambar!");

  btn.innerText = "⏳ Uploading Images...";
  btn.disabled = true;

  try {
    const uploadedUrls = [];
    const files = Array.from(fileInput.files);

    // Loop untuk upload setiap gambar
    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await _supabase.storage.from('product-image').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = _supabase.storage.from('product-image').getPublicUrl(fileName);
      uploadedUrls.push(urlData.publicUrl);
    }

    // Simpan ke database (Guna URL pertama sebagai image_url utama, dan semua URL dalam array images)
    await _supabase.from('products').insert([{ 
      name: document.getElementById('p-name').value, 
      price: parseFloat(document.getElementById('p-price').value), 
      original_price: parseFloat(document.getElementById('p-original-price').value) || null,
      sold_count: parseInt(document.getElementById('p-sold').value) || 0,
      category: document.getElementById('p-category').value || 'Lain-lain',
      rating: parseInt(document.getElementById('p-rating').value),
      review_text: document.getElementById('p-review').value,
      image_url: uploadedUrls[0], // Gambar pertama
      images: uploadedUrls, // Semua gambar
      affiliate_url: document.getElementById('p-link').value 
    }]);

    alert("✅ Produk berjaya ditambah!");
    location.reload();
  } catch (err) { alert(err.message); }
}

// (Fungsi toggleAdmin, deleteProduct, generateSidebarCategories, setCategory kekal sama macam sebelum ni)
function toggleAdmin() { document.getElementById('admin-panel').classList.toggle('hidden'); filterProducts(); }
function setCategory(cat) { currentCategory = cat; document.getElementById('active-cat-label').innerText = "Kategori: " + cat; toggleSidebar(); generateSidebarCategories(); filterProducts(); }
function toggleSidebar() { 
  const s = document.getElementById('sidebar'); 
  const o = document.getElementById('sidebar-overlay');
  if (s.classList.contains('sidebar-hidden')) { s.classList.replace('sidebar-hidden', 'sidebar-visible'); o.classList.remove('hidden'); }
  else { s.classList.replace('sidebar-visible', 'sidebar-hidden'); o.classList.add('hidden'); }
}
function generateSidebarCategories() {
  const list = document.getElementById('category-list');
  const categories = ['Semua', ...new Set(allProducts.map(p => p.category).filter(c => c))];
  list.innerHTML = '';
  categories.forEach(cat => {
    const isActive = currentCategory === cat;
    list.innerHTML += `<button onclick="setCategory('${cat}')" class="text-left py-3 px-4 rounded-xl text-sm font-bold ${isActive ? 'bg-orange-600 text-white' : 'bg-gray-50 text-gray-600'} uppercase">${cat}</button>`;
  });
}
async function deleteProduct(id) {
  if (confirm("Padam?")) { await _supabase.from('products').delete().eq('id', id); loadProducts(); }
}

loadProducts();
