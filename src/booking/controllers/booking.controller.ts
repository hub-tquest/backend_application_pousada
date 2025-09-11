// src/booking/controllers/booking.controller.ts (adicionar no topo)
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
  HttpException,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { BookingService } from '../services/booking.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../../auth/dto/update-booking.dto';
import { ChatbotBookingQueryDto } from '../dto/chatbot-booking-query.dto';

@ApiTags('booking')
@ApiBearerAuth()
@Controller('booking')
@UseGuards(AuthGuard('jwt'))
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Criar nova reserva' })
  @ApiResponse({ status: 201, description: 'Reserva criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiBody({ type: CreateBookingDto })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Creating booking for user: ${userId}`);

      const result = await this.bookingService.createBooking(
        createBookingDto,
        userId,
      );
      this.logger.log(`Booking created successfully for user: ${userId}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error creating booking: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to create booking',
          timestamp: new Date().toISOString(),
          path: '/booking',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as reservas do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reservas retornada com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  async findAll(@Request() req) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Fetching all bookings for user: ${userId}`);

      const bookings = await this.bookingService.getUserBookings(userId);
      this.logger.log(`Found ${bookings.length} bookings for user: ${userId}`);

      return bookings;
    } catch (error) {
      this.logger.error(
        `Error fetching bookings: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch bookings',
          timestamp: new Date().toISOString(),
          path: '/booking',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma reserva específica' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da reserva retornados com sucesso',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Fetching booking ${id} for user: ${userId}`);

      const booking = await this.bookingService.getBookingById(id, userId);
      this.logger.log(`Booking ${id} fetched successfully for user: ${userId}`);

      return booking;
    } catch (error) {
      this.logger.error(
        `Error fetching booking ${id}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to fetch booking',
          timestamp: new Date().toISOString(),
          path: `/booking/${id}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar uma reserva existente' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiResponse({ status: 200, description: 'Reserva atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req,
  ) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Updating booking ${id} for user: ${userId}`);

      const updatedBooking = await this.bookingService.updateBooking(
        id,
        updateBookingDto,
        userId,
      );
      this.logger.log(`Booking ${id} updated successfully for user: ${userId}`);

      return updatedBooking;
    } catch (error) {
      this.logger.error(
        `Error updating booking ${id}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update booking',
          timestamp: new Date().toISOString(),
          path: `/booking/${id}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar uma reserva' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Deleting booking ${id} for user: ${userId}`);

      const result = await this.bookingService.cancelBooking(id, userId);
      this.logger.log(`Booking ${id} deleted successfully for user: ${userId}`);

      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting booking ${id}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete booking',
          timestamp: new Date().toISOString(),
          path: `/booking/${id}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar uma reserva (endpoint alternativo)' })
  @ApiParam({ name: 'id', description: 'ID da reserva' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Reserva não encontrada' })
  async cancelBooking(@Param('id') id: string, @Request() req) {
    try {
      const userId = this.extractUserId(req);
      this.logger.log(`Cancelling booking ${id} for user: ${userId}`);

      const cancelledBooking = await this.bookingService.cancelBooking(
        id,
        userId,
      );
      this.logger.log(
        `Booking ${id} cancelled successfully for user: ${userId}`,
      );

      return cancelledBooking;
    } catch (error) {
      this.logger.error(
        `Error cancelling booking ${id}: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to cancel booking',
          timestamp: new Date().toISOString(),
          path: `/booking/${id}/cancel`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private extractUserId(req: any): string {
    this.logger.debug(
      `Extracting user ID from request: ${JSON.stringify({
        user: req.user,
        userId: req.user?.userId || req.user?.uid || req.user?.id,
      })}`,
    );

    const userId =
      req.user?.userId || req.user?.uid || req.user?.id || req.userId;

    if (!userId) {
      this.logger.error(
        'User ID not found in request',
        JSON.stringify(req.user),
      );
      throw new HttpException(
        {
          success: false,
          message: 'User not authenticated - User ID not found',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return userId;
  }
}
