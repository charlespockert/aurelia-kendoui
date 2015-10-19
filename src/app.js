export class App {
  configureRouter(config, router) {
    config.title = 'Aurelia-KendoUI';
    config.map([
      { route: ['', 'welcome'], name: 'welcome',      moduleId: 'welcome',      nav: true, title: 'Welcome' },
      { route: ['i-powered'],   name: 'i-powered',    moduleId: 'i-powered',    nav: true, title: 'Input Powered Controls' },
      { route: 'button',        name: 'button',       moduleId: 'button',       nav: true, title: 'Kendo Button' },
      { route: 'grid',          name: 'grid',         moduleId: 'grid',         nav: true, title: 'Kendo Grid' }           
    ]);

    this.router = router;
  }
}
