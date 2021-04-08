describe('post deploy hook', () => {
    test('import', async () => {
        await import('./postdeploy');
    });
});
