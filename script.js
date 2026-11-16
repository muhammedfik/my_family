let treeData = null;
let selectedNode = null;
let i = 0;

const treeContainer = document.getElementById("tree");
let width = treeContainer.clientWidth;
let height = treeContainer.clientHeight;

const svg = d3.select("#tree").append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .call(d3.zoom().on("zoom", (e) => g.attr("transform", e.transform)))
    .append("g");

const g = svg.append("g").attr("transform", `translate(${width / 2}, 60)`);
const treeLayout = d3.tree().nodeSize([180, 100]);

window.addEventListener("resize", () => {
    width = treeContainer.clientWidth;
    height = treeContainer.clientHeight;
});

const saved = localStorage.getItem("familyTreeData");
if (saved) {
    treeData = JSON.parse(saved);
    initTree();
} else {
    fetch('family.json')
        .then(res => res.json())
        .then(data => {
            treeData = data;
            initTree();
        });
}

let root;
function initTree() {
    root = d3.hierarchy(treeData, d => d.children);
    root.x0 = 0;
    root.y0 = 0;
    if (root.children) root.children.forEach(collapse);
    update(root);
}

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function expandAll() {
    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        if (d.children) {
            d.children.forEach(expand);
        }
    }
    expand(root);
    update(root);
}

function update(source) {
    const nodes = treeLayout(root).descendants();
    const links = root.links();

    const link = g.selectAll(".link").data(links, d => d.target.id || (d.target.id = ++i));
    link.enter().append("path")
        .attr("class", "link")
        .merge(link)
        .transition().duration(300)
        .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));
    link.exit().remove();

    const node = g.selectAll(".node").data(nodes, d => d.id || (d.id = ++i));
    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    nodeEnter.append("circle")
        .attr("r", 7)
        .on("click", (event, d) => {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        });

    nodeEnter.append("text")
        .attr("dy", -14)
        .attr("text-anchor", "middle")
        .text(d => d.data.name)
        .on("click", (event, d) => showLineage(d));

    const nodeUpdate = nodeEnter.merge(node);
    nodeUpdate.transition().duration(300)
        .attr("transform", d => `translate(${d.x},${d.y})`);
    
    nodeUpdate.select("circle")
        .attr("class", d => d._children ? "has-children" : "");
    nodeUpdate.select("text")
        .text(d => d.data.name);

    node.exit().remove();
}

function showLineage(d) {
    selectedNode = d;
    document.getElementById("selected-name").innerText = d.data.name;
    const ancestors = d.ancestors().map(a => a.data.name);
    document.getElementById("lineage-box").innerText = ancestors.join(" بن ");
}

function copyLineage() {
    const text = document.getElementById("lineage-box").innerText;
    navigator.clipboard.writeText(text);
    alert("تم نسخ النسب!");
}

function saveToLocal() {
    function clean(node) {
        const obj = { name: node.data.name, children: [] };
        const kids = node.children || node._children || [];
        obj.children = kids.map(clean);
        return obj;
    }
    localStorage.setItem("familyTreeData", JSON.stringify(clean(root)));
}

function addChild() {
    if (!selectedNode) return alert("اختر شخصاً أولاً");
    const name = prompt("أدخل اسم الابن:");
    if (!name) return;
    if (!selectedNode.children && !selectedNode._children) selectedNode.children = [];
    if (selectedNode._children) {
        selectedNode.children = selectedNode._children;
        selectedNode._children = null;
    }
    const newNode = d3.hierarchy({ name: name, children: [] });
    newNode.depth = selectedNode.depth + 1;
    newNode.parent = selectedNode;
    selectedNode.children.push(newNode);
    saveToLocal();
    update(selectedNode);
}

function editNode() {
    if (!selectedNode) return alert("اختر شخصاً أولاً");
    const newName = prompt("الاسم الجديد:", selectedNode.data.name);
    if (newName) {
        selectedNode.data.name = newName;
        saveToLocal();
        update(selectedNode);
        showLineage(selectedNode);
    }
}

function deleteNode() {
    if (!selectedNode || !selectedNode.parent) return alert("لا يمكن حذف الجذر الرئيسي");
    if (confirm("هل أنت متأكد من الحذف؟")) {
        const parent = selectedNode.parent;
        parent.children = parent.children.filter(c => c !== selectedNode);
        selectedNode = null;
        saveToLocal();
        update(parent);
    }
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem("familyTreeData"));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "family.json");
    dlAnchor.click();
}