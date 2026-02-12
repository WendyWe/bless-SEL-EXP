// 包裝 fetch + timeout
function fetchWithTimeout(url, options, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

document.addEventListener('DOMContentLoaded', () => {
  const panasPreForm = document.getElementById('panas-pre-form');
  const panasPostSection = document.getElementById('panas-post-section');
  const affectPre = document.getElementById('affectgrid-pre-section');
  const affectPost = document.getElementById('affectgrid-post-section');
  const writingSection = document.getElementById('writing-section');
  const endSection = document.getElementById('end-section');

  // -------- Affect Grid 建立函數 --------
  function setupAffectGrid(containerId, feedbackId, confirmBtnId, nextCallback) {
    const gridContainer = document.getElementById(containerId);
    const feedback = document.getElementById(feedbackId);
    const confirmBtn = document.getElementById(confirmBtnId);
    let selectedSquare = null;

    const getColor = (x, y) => {
      if (y > 5 && x > 5) return "rgba(255, 215, 0, 0.8)";
      if (y > 5 && x < 5) return "rgba(255, 69, 58, 0.8)";
      if (y < 5 && x > 5) return "rgba(50, 205, 50, 0.8)";
      if (y < 5 && x < 5) return "rgba(65, 105, 225, 0.8)";
      return "rgba(200,200,200,0.5)";
    };

    // 生成 9x9
    for (let y = 9; y >= 1; y--) {
      for (let x = 1; x <= 9; x++) {
        const gridItem = document.createElement('div');
        gridItem.classList.add('grid-item');
        gridItem.dataset.x = x;
        gridItem.dataset.y = y;
        gridItem.addEventListener('click', () => {
          gridContainer.querySelectorAll('.grid-item').forEach(item => {
            item.classList.remove('selected');
            item.style.backgroundColor = "#f9f9f9";
          });
          gridItem.classList.add('selected');
          gridItem.style.backgroundColor = getColor(x, y);
          selectedSquare = { x, y };
          feedback.textContent = `已選擇：X = ${x}, Y = ${y}`;
        });
        gridContainer.appendChild(gridItem);
      }
    }

    confirmBtn.addEventListener('click', () => {
      if (!selectedSquare) {
        alert("請先選擇一個格子！");
        return;
      }
      nextCallback();
    });
  }

  // --------- 流程控制 ---------
  panasPreForm.addEventListener('submit', e => {
    e.preventDefault();
    document.getElementById('panas-pre-section').classList.add('hidden');
    affectPre.classList.remove('hidden');
  });

  setupAffectGrid("grid-pre", "feedback-pre", "confirm-pre-grid", () => {
    affectPre.classList.add('hidden');
    writingSection.classList.remove('hidden');
  });

  // 心理位移書寫 → API 回饋
  const btn = document.getElementById('btn');
  const out = document.getElementById('out');
  const statusEl = document.getElementById('status');
  const selfEl = document.getElementById('self');
  const youEl = document.getElementById('you');
  const heEl = document.getElementById('he');
  const backEl = document.getElementById('back');

  btn.addEventListener('click', async () => {
    const self = selfEl.value.trim();
    const you = youEl.value.trim();
    const he = heEl.value.trim();
    const back = backEl.value.trim();
    const minLength = 5;

    if ([self, you, he, back].some(v => v.length < minLength)) {
      out.textContent = `四個位格都要各輸入至少 ${minLength} 個字。`;
      return;
    }

    const text = `
【我的位格】${self}
【你的位格】${you}
【他的位格】${he}
【回到我的位格】${back}
    `.trim();

    btn.disabled = true;
    statusEl.textContent = '產生回饋中…';
    out.textContent = '';

    try {
      const resp = await fetchWithTimeout('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      }, 10000);

      if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try {
          const data = await resp.json();
          if (data?.error) msg += ` - ${data.error}`;
        } catch {}
        throw new Error(msg);
      }

      const data = await resp.json();
      out.innerText = data.feedback || '(沒有拿到回饋內容)';
    } catch (err) {
      if (err.name === 'AbortError') {
        out.textContent = '請求逾時，伺服器可能沒有回應。';
      } else {
        out.textContent = `發生錯誤：${err.message}`;
      }
    } finally {
      btn.disabled = false;
      statusEl.textContent = '';
    }
  });

  // 完成書寫 → Affect Grid 後測
  document.getElementById('finish-writing').addEventListener('click', () => {
    writingSection.classList.add('hidden');
    affectPost.classList.remove('hidden');
  });

  setupAffectGrid("grid-post", "feedback-post", "confirm-post-grid", () => {
    affectPost.classList.add('hidden');

    // 🔥 Clone 前測 PANAS 當作後測
    const postForm = panasPreForm.cloneNode(true);
    postForm.id = 'panas-post-form';
    // 修改所有 name 屬性避免衝突
    postForm.querySelectorAll('input').forEach(input => {
      input.name = input.name + "_post";
      input.checked = false;
    });
    postForm.addEventListener('submit', e => {
      e.preventDefault();
      panasPostSection.classList.add('hidden');
      endSection.classList.remove('hidden');
    });
    panasPostSection.appendChild(postForm);
    panasPostSection.classList.remove('hidden');
  });
});

