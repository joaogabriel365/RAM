from ..config import settings
from .base import RobotDriver


def create_driver() -> RobotDriver:
    if settings.mock_robot:
        from .mock import MockDriver

        return MockDriver()
    from .serial_driver import SerialDriver

    return SerialDriver(settings.serial_port, settings.serial_baud)


__all__ = ["RobotDriver", "create_driver"]
