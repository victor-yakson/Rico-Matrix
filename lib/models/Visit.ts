import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../db";

// Define the attributes interface
interface VisitAttributes {
  id: number;
  ip_address: string | null;
  country: string;
  country_code: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  user_agent: string | null;
  path: string | null;
  timestamp: Date;
}

// Define creation attributes (id is optional when creating)
interface VisitCreationAttributes extends Optional<VisitAttributes, 'id'> {}

// Extend Model with the interfaces
export class Visit extends Model<VisitAttributes, VisitCreationAttributes> implements VisitAttributes {
  public id!: number;
  public ip_address!: string | null;
  public country!: string;
  public country_code!: string;
  public city!: string | null;
  public latitude!: number | null;
  public longitude!: number | null;
  public user_agent!: string | null;
  public path!: string | null;
  public timestamp!: Date;
}

Visit.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Unknown",
    },
    country_code: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "XX",
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "/",
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "visit",
    tableName: "visits",
    timestamps: false,
  }
);