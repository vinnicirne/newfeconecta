async function test() {
    console.log("Enviando comando de extração para a VPS...");
    try {
        const response = await fetch('http://vps9432.panel.icontainer.cloud:8080/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://www.youtube.com/shorts/5qap5aO4i9A' }) // Short video "Lofi hip hop short"
        });
        const data = await response.json();
        console.log("\n--- RESULTADO ---");
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Erro:", e.message);
    }
}
test();
