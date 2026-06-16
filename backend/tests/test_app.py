from app import create_app


def test_create_app_registers_core_routes():
    app = create_app()
    paths = {route.path for route in app.routes if hasattr(route, "path")}

    assert "/ws" in paths
    assert "/api/health" in paths
    assert "/api/words" in paths
