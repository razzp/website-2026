import { PageEntitiesHelper } from '../components/PageEntitiesHelper';

const pageEntities = new PageEntitiesHelper();

function init(): void {
    console.log('about initialised');
}

function destroy(): void {
    pageEntities.killAll();

    console.log('about destroyed');
}

export { destroy, init };
