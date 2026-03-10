const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');
async function test() {
    try {
        const records = await pb.collection('tvlk_pages').getFullList({ fields: 'sub_tag' });
        const tags = [...new Set(records.map(r => r.sub_tag).filter(Boolean))];
        console.log("Sub Tags:", tags);
        const meta = await pb.collection('platform_metadata').getFullList();
        console.log("Meta Types:", [...new Set(meta.map(r => r.type))]);
    } catch (e) { console.error(e); }
}
test();
